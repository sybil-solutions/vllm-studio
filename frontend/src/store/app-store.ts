import { create, type StateCreator } from "zustand";
import { devtools, persist, createJSONStorage } from "zustand/middleware";
import { createChatSlice, type ChatSlice } from "./chat-slice";
import { createThemeSlice, type ThemeSlice } from "./theme-slice";

export type AppStore = ChatSlice &
  ThemeSlice & {
    _hasHydrated: boolean;
    setHasHydrated: (hasHydrated: boolean) => void;
  };

const createAppStore: StateCreator<AppStore, [], [], AppStore> = (set, ...args) => ({
  ...createChatSlice(set, ...args),
  ...createThemeSlice(set, ...args),
  _hasHydrated: false,
  setHasHydrated: (hasHydrated) => set({ _hasHydrated: hasHydrated }),
});

const storage = createJSONStorage(() =>
  typeof window !== "undefined" ? localStorage : (undefined as unknown as Storage),
);

export const useAppStore = create<AppStore>()(
  devtools(
    persist(createAppStore, {
      name: "vllm-studio-chat-state",
      storage,
      skipHydration: true,
      partialize: (state) => ({
        selectedModel: state.selectedModel,
        systemPrompt: state.systemPrompt,
        customChatModels: state.customChatModels,
        mcpEnabled: state.mcpEnabled,
        artifactsEnabled: state.artifactsEnabled,
        deepResearch: state.deepResearch,
        themeId: state.themeId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setAgentMode(true);
        state?.setHasHydrated(true);
        if (state?.themeId) {
          state.setThemeId(state.themeId);
        }
      },
    }),
    {
      name: "vllm-studio",
    },
  ),
);
