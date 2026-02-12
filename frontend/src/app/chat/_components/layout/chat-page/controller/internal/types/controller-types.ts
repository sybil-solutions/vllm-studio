import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react";
import type { ChatRunStreamEvent } from "@/lib/api";
import type { ChatMessage, ChatSession, ToolResult } from "@/lib/types";
import type {
  useAgentFiles,
  useAgentState,
  useChatMessageMapping,
  useChatSessions,
  useChatTools,
  useChatUsage,
} from "@/app/chat/hooks";
import type { useChatPageStore } from "../use-chat-page-store";

export type ChatPageStore = ReturnType<typeof useChatPageStore>;
export type ChatSessionsService = ReturnType<typeof useChatSessions>;
export type ChatToolsService = ReturnType<typeof useChatTools>;
export type ChatUsageService = ReturnType<typeof useChatUsage>;
export type AgentFilesService = ReturnType<typeof useAgentFiles>;
export type AgentStateService = ReturnType<typeof useAgentState>;
export type MessageMappingService = ReturnType<typeof useChatMessageMapping>;

export type SetMessages = Dispatch<SetStateAction<ChatMessage[]>>;

export type MessagesRef = MutableRefObject<ChatMessage[]>;
export type MessagesLengthRef = MutableRefObject<number>;
export type SessionIdRef = MutableRefObject<string | null>;

export type ToolResultsMap = Map<string, ToolResult>;
export type ChatRunEvent = ChatRunStreamEvent;

export type UpdateSessions = (updater: (sessions: ChatSession[]) => ChatSession[]) => void;

export interface RouterLike {
  replace: (href: string) => void;
  push: (href: string) => void;
}

export type MessagesContainerRef = RefObject<HTMLDivElement | null>;
export type MessagesEndRef = RefObject<HTMLDivElement | null>;

