/**
 * Chat state persistence layer using localStorage
 */

const STORAGE_KEY = "vllm_chat_state";
const STATE_VERSION = 1;
const EXPIRY_DAYS = 7;

export interface PersistedChatState {
  version: number;
  currentSessionId: string | null;
  input: string;
  selectedModel: string;
  mcpEnabled: boolean;
  artifactsEnabled: boolean;
  systemPrompt: string;
  lastUpdated: number;
  sidebarCollapsed: boolean;
}

const defaultState: PersistedChatState = {
  version: STATE_VERSION,
  currentSessionId: null,
  input: "",
  selectedModel: "",
  mcpEnabled: false,
  artifactsEnabled: false,
  systemPrompt: "",
  lastUpdated: Date.now(),
  sidebarCollapsed: true,
};

export function loadState(): PersistedChatState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...defaultState };

    const parsed = JSON.parse(stored) as PersistedChatState;

    // Check version and expiry
    if (parsed.version !== STATE_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      return { ...defaultState };
    }

    const expiryMs = EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    if (Date.now() - parsed.lastUpdated > expiryMs) {
      localStorage.removeItem(STORAGE_KEY);
      return { ...defaultState };
    }

    return parsed;
  } catch {
    return { ...defaultState };
  }
}
