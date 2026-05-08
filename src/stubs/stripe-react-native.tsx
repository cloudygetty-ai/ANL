// src/stubs/stripe-react-native.tsx
// Web stub — Stripe React Native requires native modules.

import React from "react";

export const StripeProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const useStripe = () => ({
  initPaymentSheet: async () => ({ error: null }),
  presentPaymentSheet: async () => ({ error: null }),
});
export const usePaymentSheet = () => ({
  loading: false,
  initPaymentSheet: async () => ({}),
  presentPaymentSheet: async () => ({}),
});
export default { StripeProvider, useStripe };
