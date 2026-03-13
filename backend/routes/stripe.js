// routes/stripe.js
const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../db/pool');
const auth = require('../middleware/auth');

const PLANS = {
  free: { priceId: null, label: 'Free', price: 0 },
  plus: { priceId: process.env.STRIPE_PLUS_PRICE_ID, label: 'Plus', price: 9.99 },
  premium: { priceId: process.env.STRIPE_PREMIUM_PRICE_ID, label: 'Premium', price: 24.99 },
};

// ─── CREATE / RETRIEVE CUSTOMER ───────────────────────────────
async function getOrCreateCustomer(userId, email) {
  const { rows } = await db.query(
    'SELECT stripe_customer_id FROM users WHERE id = $1',
    [userId]
  );
  if (rows[0]?.stripe_customer_id) return rows[0].stripe_customer_id;

  const customer = await stripe.customers.create({ email, metadata: { userId } });
  await db.query(
    'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
    [customer.id, userId]
  );
  return customer.id;
}

// ─── GET CURRENT SUBSCRIPTION ─────────────────────────────────
router.get('/subscription', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT subscription_tier, subscription_status, subscription_expires_at,
              stripe_customer_id, stripe_subscription_id
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CREATE CHECKOUT SESSION ──────────────────────────────────
router.post('/create-checkout', auth, async (req, res) => {
  const { tier } = req.body;
  if (!PLANS[tier] || tier === 'free') {
    return res.status(400).json({ error: 'Invalid tier' });
  }

  try {
    const customerId = await getOrCreateCustomer(req.user.id, req.user.email);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: PLANS[tier].priceId, quantity: 1 }],
      success_url: `${process.env.APP_DEEP_LINK}://subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_DEEP_LINK}://subscription/cancel`,
      metadata: { userId: req.user.id, tier },
      subscription_data: {
        metadata: { userId: req.user.id, tier },
      },
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CREATE PAYMENT SHEET (React Native Stripe SDK) ───────────
router.post('/payment-sheet', auth, async (req, res) => {
  const { tier } = req.body;
  if (!PLANS[tier] || tier === 'free') {
    return res.status(400).json({ error: 'Invalid tier' });
  }

  try {
    const customerId = await getOrCreateCustomer(req.user.id, req.user.email);

    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: '2023-10-16' }
    );

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: PLANS[tier].priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: { userId: req.user.id, tier },
    });

    const paymentIntent = subscription.latest_invoice.payment_intent;

    // Store pending subscription
    await db.query(
      `UPDATE users SET stripe_subscription_id = $1, subscription_tier = $2,
       subscription_status = 'pending' WHERE id = $3`,
      [subscription.id, tier, req.user.id]
    );

    res.json({
      paymentIntent: paymentIntent.client_secret,
      ephemeralKey: ephemeralKey.secret,
      customer: customerId,
      subscriptionId: subscription.id,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── ONE-TIME BOOST PURCHASE ──────────────────────────────────
router.post('/boost', auth, async (req, res) => {
  try {
    const customerId = await getOrCreateCustomer(req.user.id, req.user.email);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: 499, // $4.99 in cents
      currency: 'usd',
      customer: customerId,
      metadata: { userId: req.user.id, type: 'boost' },
    });

    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── CANCEL SUBSCRIPTION ──────────────────────────────────────
router.post('/cancel', auth, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT stripe_subscription_id FROM users WHERE id = $1',
      [req.user.id]
    );
    const subId = rows[0]?.stripe_subscription_id;
    if (!subId) return res.status(404).json({ error: 'No active subscription' });

    const cancelled = await stripe.subscriptions.update(subId, {
      cancel_at_period_end: true,
    });

    await db.query(
      `UPDATE users SET subscription_status = 'cancelling' WHERE id = $1`,
      [req.user.id]
    );

    res.json({ cancelAt: new Date(cancelled.cancel_at * 1000) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── WEBHOOK ──────────────────────────────────────────────────
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const sub = event.data.object;
          const tier = sub.metadata.tier || 'plus';
          const status = sub.status === 'active' ? 'active' : sub.status;
          await db.query(
            `UPDATE users SET subscription_tier = $1, subscription_status = $2,
             subscription_expires_at = to_timestamp($3), stripe_subscription_id = $4
             WHERE stripe_customer_id = $5`,
            [tier, status, sub.current_period_end, sub.id, sub.customer]
          );
          break;
        }

        case 'customer.subscription.deleted': {
          const sub = event.data.object;
          await db.query(
            `UPDATE users SET subscription_tier = 'free', subscription_status = 'inactive',
             subscription_expires_at = NULL WHERE stripe_customer_id = $1`,
            [sub.customer]
          );
          break;
        }

        case 'payment_intent.succeeded': {
          const pi = event.data.object;
          if (pi.metadata.type === 'boost') {
            await db.query(
              `UPDATE users SET boost_expires_at = NOW() + INTERVAL '30 minutes'
               WHERE id = $1`,
              [pi.metadata.userId]
            );
          }
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          await db.query(
            `UPDATE users SET subscription_status = 'past_due'
             WHERE stripe_customer_id = $1`,
            [invoice.customer]
          );
          break;
        }
      }
    } catch (err) {
      console.error('Webhook handler error:', err);
    }

    res.json({ received: true });
  }
);

module.exports = router;
