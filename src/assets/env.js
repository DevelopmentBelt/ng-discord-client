// Development runtime environment config.
// In production this file is replaced by docker/frontend/generate-env.sh.
// Do NOT commit production hostnames here.
window.__env = {
  apiUrl: 'http://localhost:80',
  wsUrl:  'ws://localhost:8080'
};
