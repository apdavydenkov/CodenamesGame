const BASE = import.meta.env.VITE_API_URL;

async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: body && { 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));

  // Сервер отвечает в формате PocketBase: при ошибке в data лежит message
  if (!response.ok) throw new Error(data.message);

  return data;
}

const users = '/api/collections/users/records';

export const api = {
  userExists: async (username) => (await request(`${users}?username=${encodeURIComponent(username)}`)).totalItems > 0,
  register: (username) => request(users, { method: 'POST', body: { username } }),
  login: (identity, password) => request('/api/collections/users/auth-with-password', { method: 'POST', body: { identity, password } }),
  changeUsername: (id, username, password) => request(`${users}/${id}`, { method: 'PATCH', body: { username, password } }),
  aiGame: (id) => request(`/api/collections/ai_games/records/${id}`),
  generateWords: (topic) => request('/api/ai-words', { method: 'POST', body: { topic } }),
};
