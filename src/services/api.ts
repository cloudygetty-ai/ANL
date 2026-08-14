// Re-export the shared typed fetch client so both src/hooks/** and src/services/**
// can import from a consistent path without crossing layer boundaries.
export { api, setApiToken } from '../lib/api';
