// Talks to the looped backend (see /backend in this project). The backend
// is a separate origin, so every call sends credentials so the httpOnly
// "userId" cookie set at signup goes along with it.
//
// Set VITE_API_URL in app/.env(.local), e.g.:
//   VITE_API_URL=http://localhost:3000

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
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

  signup: (firstName, lastName, phone) =>
    request('/api/signup', { method: 'POST', body: JSON.stringify({ firstName, lastName, phone }) }),
  logout: () => request('/api/logout', { method: 'POST' }),

  me: () => request('/api/me'),
  updateBio: (bio) => request('/api/me', { method: 'PATCH', body: JSON.stringify({ bio }) }),

  friends: () => request('/api/friends'),
  inviteFriend: (phone) => request('/api/friends', { method: 'POST', body: JSON.stringify({ phone }) }),
  discoverUsers: () => request('/api/users/discover'),
  addFriend: (id) => request(`/api/friends/${id}`, { method: 'POST' }),
  removeFriend: (id) => request(`/api/friends/${id}`, { method: 'DELETE' }),

  events: () => request('/api/events'),
  createEvent: (payload) => request('/api/events', { method: 'POST', body: JSON.stringify(payload) }),
  cancelEvent: (id) => request(`/api/events/${id}`, { method: 'DELETE' }),
  joinEvent: (id) => request(`/api/events/${id}/join`, { method: 'POST' }),
  leaveEvent: (id) => request(`/api/events/${id}/join`, { method: 'DELETE' }),

  pings: () => request('/api/pings'),
  markPingsRead: () => request('/api/pings/read', { method: 'POST' }),
  pingAction: (id) => request(`/api/pings/${id}/action`, { method: 'POST' })
};