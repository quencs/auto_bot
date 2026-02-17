const BASE = '/api';

// Deduplicate concurrent GET requests to the same endpoint
const pendingGets = new Map();

async function request(path, options = {}) {
  const method = options.method || 'GET';

  // Deduplicate GET requests
  if (method === 'GET') {
    const existing = pendingGets.get(path);
    if (existing) return existing;

    const promise = doRequest(path, options).finally(() => {
      pendingGets.delete(path);
    });
    pendingGets.set(path, promise);
    return promise;
  }

  return doRequest(path, options);
}

async function doRequest(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (res.status === 401) {
    const onLoginPage = window.location.pathname === '/dashboard' || window.location.pathname === '/dashboard/';
    if (!onLoginPage) {
      window.location.href = '/dashboard';
    }
    return null;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }

  return res.json();
}

export const api = {
  // Auth
  getMe: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),

  // Guilds
  getGuilds: () => request('/guilds'),
  getGuild: (id) => request(`/guilds/${id}`),
  getConfig: (id) => request(`/guilds/${id}/config`),
  updateConfig: (id, data) => request(`/guilds/${id}/config`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Welcome
  getWelcome: (id) => request(`/guilds/${id}/welcome`),
  updateWelcome: (id, data) => request(`/guilds/${id}/welcome`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Logs
  getLogs: (id) => request(`/guilds/${id}/logs`),
  updateLogs: (id, data) => request(`/guilds/${id}/logs`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Onboarding
  getOnboarding: (id) => request(`/guilds/${id}/onboarding`),
  updateOnboarding: (id, data) => request(`/guilds/${id}/onboarding`, { method: 'PATCH', body: JSON.stringify(data) }),
  testOnboarding: (id) => request(`/guilds/${id}/onboarding/test`, { method: 'POST' }),

  // Tickets
  getTickets: (id) => request(`/guilds/${id}/tickets`),
  updateTickets: (id, data) => request(`/guilds/${id}/tickets`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Embeds
  getEmbeds: (id) => request(`/guilds/${id}/embeds`),
  createEmbed: (id, data) => request(`/guilds/${id}/embeds`, { method: 'POST', body: JSON.stringify(data) }),
  updateEmbed: (id, embedId, data) => request(`/guilds/${id}/embeds/${embedId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteEmbed: (id, embedId) => request(`/guilds/${id}/embeds/${embedId}`, { method: 'DELETE' }),
  sendEmbed: (id, embedId, channelId) => request(`/guilds/${id}/embeds/${embedId}/send`, { method: 'POST', body: JSON.stringify({ channelId }) }),
};
