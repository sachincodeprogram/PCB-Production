const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'ownerToken';

// Session storage: closing the browser tab signs the owner out.
export const getToken = () => sessionStorage.getItem(TOKEN_KEY);
export const clearToken = () => sessionStorage.removeItem(TOKEN_KEY);

export class UnauthorizedError extends Error {}

export async function request(method, path, body) {
  const token = getToken();
  const res = await fetch(`${BASE}/owner${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // Empty or non-JSON body.
  }

  if (res.status === 401 && path !== '/login') {
    clearToken();
    throw new UnauthorizedError('Session expired. Please sign in again.');
  }
  if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
  return data;
}

export async function login(username, password) {
  const data = await request('POST', '/login', { username, password });
  sessionStorage.setItem(TOKEN_KEY, data.token);
}
