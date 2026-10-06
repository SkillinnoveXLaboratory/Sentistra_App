import * as SecureStore from "expo-secure-store";

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL || "https://server.skillinnovex.in").replace(/\/+$/, "");
const ACCESS_TOKEN_KEY = "sentistra_access_token";
const USER_KEY = "sentistra_session_user";

export async function saveSession(session) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, session.access_token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(session.user));
}

export async function saveSessionUser(user) {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function clearSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY)
  ]);
}

export async function restoreSession() {
  const [accessToken, storedUser] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.getItemAsync(USER_KEY)
  ]);
  if (!accessToken || !storedUser) return null;
  try {
    return { access_token: accessToken, user: JSON.parse(storedUser) };
  } catch {
    await clearSession();
    return null;
  }
}

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function authenticatedFetch(path, options = {}) {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new Error("Your session has expired. Please sign in again.");
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${accessToken}`);
  return fetch(`${API_BASE_URL}${path}`, { ...options, headers });
}

export async function validateStoredSession() {
  const restored = await restoreSession();
  if (!restored) return null;
  try {
    const response = await authenticatedFetch("/me", { headers: { "Cache-Control": "no-cache" } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.user) throw new Error("Invalid session");
    return { ...restored, user: result.user };
  } catch {
    await clearSession();
    return null;
  }
}

export function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}
