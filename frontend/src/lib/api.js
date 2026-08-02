// ====================================================
// SAVE TO: frontend/src/lib/api.js
// ====================================================
// Talks to the looped backend (see /backend in this project). The backend
// is a separate origin. We used to rely solely on the httpOnly "userId"
// cookie set at signup, but mobile browsers (iOS Safari's cross-site
// tracking prevention in particular) block or drop cross-site cookies like
// that, which broke auth right after verification on mobile. So on top of
// the cookie, we also keep the same userId as a bearer token in
// localStorage and send it as an Authorization header — that's not subject
// to cross-site cookie blocking at all.
//
// Set VITE_API_URL in app/.env(.local), e.g.:
//   VITE_API_URL=http://localhost:3000

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const TOKEN_KEY = 'looped_session_token';

function getToken() {
  try { return localStorage.getItem(TOKEN_KEY); } catch (e) { return null; }
}

function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch (e) { /* localStorage unavailable — cookie fallback still applies */ }
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(BASE + path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    },
    ...options
  });
  let body = null;
  try { body = await res.json(); } catch (e) { /* empty body */ }
  if (!res.ok) {
    const err = new Error((body && body.error) || res.statusText);
    err.status = res.status;
    throw err;
  }
  return body;
}

export const api = {
  sendVerificationCode: (phone) =>
    request('/api/verify/send', { method: 'POST', body: JSON.stringify({ phone }) }),
  checkVerificationCode: (phone, code) =>
    request('/api/verify/check', { method: 'POST', body: JSON.stringify({ phone, code }) }),

  signup: async (firstName, lastName, phone) => {
    const body = await request('/api/signup', { method: 'POST', body: JSON.stringify({ firstName, lastName, phone }) });
    if (body?.userId) setToken(body.userId);
    return body;
  },
  logout: async () => {
    try { return await request('/api/logout', { method: 'POST' }); }
    finally { setToken(null); }
  },

  me: () => request('/api/me'),
  updateBio: (bio) => request('/api/me', { method: 'PATCH', body: JSON.stringify({ bio }) }),

  friends: () => request('/api/friends'),
  inviteFriend: (phone) => request('/api/friends', { method: 'POST', body: JSON.stringify({ phone }) }),
  discoverUsers: () => request('/api/users/discover'),
  addFriend: (id) => request(`/api/friends/${id}`, { method: 'POST' }),
  removeFriend: (id) => request(`/api/friends/${id}`, { method: 'DELETE' }),
  setFriendCircle: (id, circle) =>
    request(`/api/friends/${id}`, { method: 'PATCH', body: JSON.stringify({ circle }) }),

  events: () => request('/api/events'),
  createEvent: (payload) => request('/api/events', { method: 'POST', body: JSON.stringify(payload) }),
  updateEvent: (id, payload) => request(`/api/events/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  cancelEvent: (id) => request(`/api/events/${id}`, { method: 'DELETE' }),
  joinEvent: (id) => request(`/api/events/${id}/join`, { method: 'POST' }),
  leaveEvent: (id) => request(`/api/events/${id}/join`, { method: 'DELETE' }),

  pings: () => request('/api/pings'),
  markPingsRead: () => request('/api/pings/read', { method: 'POST' }),
  pingAction: (id, decision) => request(`/api/pings/${id}/action`, { method: 'POST', body: JSON.stringify({ decision }) }),
  deletePing: (id) => request(`/api/pings/${id}`, { method: 'DELETE' })
};