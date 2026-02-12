const LAST_SESSION_STORAGE_KEY = "vllm-studio-last-session-id";

export function getLastSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(LAST_SESSION_STORAGE_KEY);
    return value && value.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

export function setLastSessionId(sessionId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_SESSION_STORAGE_KEY, sessionId);
  } catch {
    // ignore
  }
}

