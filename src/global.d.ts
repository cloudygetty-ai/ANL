// Augment ImportMeta so import.meta.env works in the TS compiler.
// Runtime resolution is handled by the Expo/Metro bundler or Vite.
interface ImportMeta {
  readonly env: Record<string, string | undefined>;
}
