import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createChatSlice, type ChatSlice } from './chat-slice';

export type AppStore = ChatSlice;

export const useAppStore = create<AppStore>()(
  devtools((...args) => ({
    ...createChatSlice(...args),
  }), {
    name: 'vllm-studio',
  })
);
