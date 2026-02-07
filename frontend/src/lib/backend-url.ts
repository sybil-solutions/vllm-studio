const BACKEND_URL_STORAGE = "vllmstudio_backend_url";
const BACKEND_URL_COOKIE = "vllmstudio_backend_url";

function getCookieValue(name: string): string {
  if (typeof document === "undefined") return "";
  const prefix = `${encodeURIComponent(name)}=`;
  for (const entry of document.cookie.split(";")) {
    const trimmed = entry.trim();
    if (trimmed.startsWith(prefix)) return decodeURIComponent(trimmed.slice(prefix.length));
  }
  return "";
}

function setBackendCookie(url: string): void {
  if (typeof document === "undefined") return;
  const trimmed = url.trim();
  const encoded = encodeURIComponent(trimmed);
  const maxAge = trimmed ? 60 * 60 * 24 * 365 : 0; // 1 year or delete
  const secure = typeof location !== "undefined" && location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${encodeURIComponent(BACKEND_URL_COOKIE)}=${encoded}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function getStoredBackendUrl(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(BACKEND_URL_STORAGE) || getCookieValue(BACKEND_URL_COOKIE) || "";
  } catch {
    return getCookieValue(BACKEND_URL_COOKIE) || "";
  }
}

export function setStoredBackendUrl(url: string): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = url.trim();
    if (trimmed) {
      window.localStorage.setItem(BACKEND_URL_STORAGE, trimmed);
    } else {
      window.localStorage.removeItem(BACKEND_URL_STORAGE);
    }
    setBackendCookie(trimmed);
  } catch {
    // Ignore storage errors
    setBackendCookie(url);
  }
}

export function clearStoredBackendUrl(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(BACKEND_URL_STORAGE);
    setBackendCookie("");
  } catch {
    // Ignore storage errors
    setBackendCookie("");
  }
}
