// src/stubs/sentry-react-native.ts
// Web stub — Sentry React Native requires native modules.
// On web, all calls are no-ops.

export const init = () => {};
export const setUser = () => {};
export const captureException = (e: unknown) => { console.error(e); };
export const captureMessage = (m: string) => { console.warn(m); };
export const withScope = (cb: (scope: any) => void) => cb({ setExtra: () => {}, setTag: () => {} });

export default { init, setUser, captureException, captureMessage, withScope };
