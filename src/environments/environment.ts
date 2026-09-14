// This file is replaced during build by environment.prod.ts for --configuration production.
// Runtime overrides can be injected via src/assets/env.js (loaded in index.html).

declare global {
  interface Window {
    // H9 — set by docker/frontend/generate-env.sh at container start for production
    __env?: { apiUrl?: string; wsUrl?: string };
  }
}

const _runtimeEnv = typeof window !== 'undefined' ? window.__env : undefined;

export const environment = {
  production: false,
  apiUrl: _runtimeEnv?.apiUrl ?? 'http://localhost:80',
  wsUrl:  _runtimeEnv?.wsUrl  ?? 'ws://localhost:8080',
};
