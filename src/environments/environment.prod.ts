// H9 — Production environment.
// URLs are intentionally read at runtime from window.__env (injected by
// docker/frontend/generate-env.sh) so the same build artefact works on any host.

declare global {
  interface Window {
    __env?: { apiUrl?: string; wsUrl?: string };
  }
}

const _runtimeEnv = typeof window !== 'undefined' ? window.__env : undefined;

export const environment = {
  production: true,
  apiUrl: _runtimeEnv?.apiUrl ?? 'https://your-api-host',
  wsUrl:  _runtimeEnv?.wsUrl  ?? 'wss://your-ws-host',
};
