/**
 * API key management utilities
 */

const API_KEY_STORAGE = "vllmstudio_api_key";

/**
 * Get the stored API key from environment variables or localStorage
 */
export function getApiKey(): string {
  // Prefer env var if available (build-time or runtime)
  const envKey = process.env.NEXT_PUBLIC_VLLM_STUDIO_API_KEY || process.env.VLLM_STUDIO_API_KEY;
  if (envKey) return envKey;

  // Fallback to localStorage
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(API_KEY_STORAGE) || "";
  } catch {
    return "";
  }
}

/**
 * Save API key to localStorage
 */
export function setApiKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    const trimmed = key.trim();
    if (trimmed) {
      window.localStorage.setItem(API_KEY_STORAGE, trimmed);
    } else {
      window.localStorage.removeItem(API_KEY_STORAGE);
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Remove API key from localStorage
 */
export function clearApiKey(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(API_KEY_STORAGE);
  } catch {
    // Ignore storage errors
  }
}
