// src/AppWeb.tsx — Pure web root. No RN imports. All screens operational.
import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseReady } from './config/supabase';
import type { Session } from '@supabase/supabase-js';
import MapScreen from './screens/MapScreen';
import DiscoveryScreen from './screens/DiscoveryScreen';
import MatchesScreen from './screens/MatchesScreen';
import ChatScreen from './screens/ChatScreen';
import ProfileScreen from './screens/ProfileScreen';

const C = {
  bg: '#04040a', purple: '#a855f7', amber: '#fbbf24',
  pink: '#ec4899', text: '#f0eee8', textDim: 'rgba(240,238,232,0.5)',
};

type Route = 'auth' | 'discovery' | 'map' | 'matches' | 'chat' | 'profile';

// ─── PHONE AUTH SCREEN ──────────────────────────────────────
function AuthScreen({ onAuth }: { onAuth: (s: Session) => void }) {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const sendOTP = async () => {
    setError('');
    const formatted = phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`;
    if (formatted.length < 11) { setError('Enter a valid phone number'); return; }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithOtp({ phone: formatted });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setStep('code');
  };

  const verifyOTP = async () => {
    setError('');
    const formatted = phone.startsWith('+') ? phone : `+1${phone.replace(/\D/g, '')}`;
    setLoading(true);
    const { data, error: err } = await supabase.auth.verifyOtp({ phone: formatted, token: code, type: 'sms' });
    setLoading(false);
    if (err || !data.session) { setError(err?.message || 'Invalid code — try again'); return; }
    onAuth(data.session);
  };

  return (
    <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 24px', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 40, letterSpacing: 3, color: C.text, display: 'flex' }}>
        <span>ALL</span><span style={{ color: C.amber }}>NIGHT</span><span>LONG</span>
      </div>
      <div style={{ fontSize: 11, color: C.textDim, letterSpacing: 4, marginBottom: 40 }}>🌙 LATE NIGHT · REAL PROXIMITY</div>
      <h2 style={{ color: C.text, fontSize: 22, fontWeight: 700, margin: '0 0 6px', alignSelf: 'flex-start', maxWidth: 360, width: '100%' }}>{step === 'phone' ? "What's your number?" : 'Enter the code'}</h2>
      <p style={{ color: C.textDim, fontSize: 14, margin: '0 0 20px', alignSelf: 'flex-start', maxWidth: 360, width: '100%' }}>{step === 'phone' ? "We'll text you a code. No spam, ever." : `Sent to +1${phone.replace(/\D/g, '')}`}</p>
      <input type="tel" value={step === 'phone' ? phone : code} onChange={e => step === 'phone' ? setPhone(e.target.value) : setCode(e.target.value)} placeholder={step === 'phone' ? 'Phone number' : '6-digit code'} maxLength={step === 'phone' ? 15 : 6}
        style={{ width: '100%', maxWidth: 360, padding: 16, fontSize: 18, background: '#0d0d14', color: C.text, border: '1px solid rgba(168,85,247,0.25)', borderRadius: 12, outline: 'none', fontFamily: "'DM Sans', sans-serif", boxSizing: 'border-box' }} />
      {error && <p style={{ color: '#f43f5e', fontSize: 13, margin: '8px 0 0', maxWidth: 360, width: '100%' }}>{error}</p>}
      <button onClick={step === 'phone' ? sendOTP : verifyOTP} disabled={loading}
        style={{ width: '100%', maxWidth: 360, marginTop: 16, padding: 16, background: loading ? 'rgba(168,85,247,0.4)' : `linear-gradient(135deg, ${C.purple}, ${C.pink})`, color: '#fff', border: 'none', borderRadius: 14, fontSize: 16, fontWeight: 700, cursor: loading ? 'wait' : 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
        {loading ? '...' : step === 'phone' ? 'Send Code' : 'Verify'}
      </button>
      {step === 'code' && <button onClick={() => { setStep('phone'); setCode(''); setError(''); }} style={{ background: 'none', border: 'none', color: C.textDim, marginTop: 12, cursor: 'pointer', fontSize: 13 }}>← Change number</button>}
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────
export default function AppWeb() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<Route>('map');
  const [chatTarget, setChatTarget] = useState<{ userId: string; name: string; convoId: string } | null>(null);

  useEffect(() => {
    if (!isSupabaseReady) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  if (loading) return (
    <div style={{ minHeight: '100dvh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: C.purple, fontSize: 18, fontFamily: "'DM Sans', sans-serif" }}>Loading...</div>
    </div>
  );

  if (!session) return <AuthScreen onAuth={setSession} />;

  const openChat = (userId: string, name: string, convoId: string) => {
    setChatTarget({ userId, name, convoId });
    setRoute('chat');
  };

  const tabs: { route: Route; icon: string; label: string }[] = [
    { route: 'discovery', icon: '🔥', label: 'Discover' },
    { route: 'map',      icon: '🗺️', label: 'Map' },
    { route: 'matches',  icon: '💬', label: 'Matches' },
    { route: 'profile',  icon: '👤', label: 'Profile' },
  ];

  return (
    <div style={{ width: '100vw', height: '100dvh', display: 'flex', flexDirection: 'column', background: C.bg, overflow: 'hidden' }}>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {route === 'discovery' && <DiscoveryScreen />}
        {route === 'map' && <MapScreen />}
        {route === 'matches' && <MatchesScreen onOpenChat={openChat} />}
        {route === 'profile' && <ProfileScreen />}
        {route === 'chat' && chatTarget && (
          <ChatScreen
            conversationId={chatTarget.convoId}
            otherUserId={chatTarget.userId}
            otherName={chatTarget.name}
            onBack={() => setRoute('matches')}
          />
        )}
      </div>

      {/* Bottom nav — hidden in chat */}
      {route !== 'chat' && (
        <nav style={{
          display: 'flex', justifyContent: 'space-around', alignItems: 'center',
          padding: '8px 0', paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
          borderTop: '1px solid rgba(168,85,247,0.12)', background: C.bg, flexShrink: 0,
        }}>
          {tabs.map(t => (
            <button key={t.route} onClick={() => setRoute(t.route)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              opacity: route === t.route ? 1 : 0.4, transition: 'opacity 0.2s',
              padding: '4px 12px',
            }}>
              <span style={{ fontSize: 22 }}>{t.icon}</span>
              <span style={{ fontSize: 10, color: route === t.route ? C.purple : C.textDim, fontWeight: route === t.route ? 700 : 400, fontFamily: "'DM Sans', sans-serif" }}>{t.label}</span>
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}
