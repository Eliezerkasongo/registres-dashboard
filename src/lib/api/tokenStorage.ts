const ACCESS_TOKEN_KEY = "registers_access_token";
const REFRESH_TOKEN_KEY = "registers_refresh_token";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getRefreshToken(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setTokens(accessToken: string, refreshToken: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } catch {
    // ignore storage errors (private mode, disabled storage, etc.)
  }
}

export function setAccessToken(accessToken: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  } catch {
    // ignore
  }
}

export function clearTokens(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // ignore
  }
}
