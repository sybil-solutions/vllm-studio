export interface Attachment {
  id: string;
  type: "file" | "image" | "audio";
  name: string;
  size: number;
  url?: string;
  file?: File;
  base64?: string;
}

export interface ModelOption {
  id: string;
  name?: string;
  maxModelLen?: number;
}

export interface ActivityItem {
  id: string;
  type: "tool-call" | "reasoning" | "research";
  timestamp: number;
  toolName?: string;
  toolCallId?: string;
  state?: "pending" | "running" | "complete" | "error";
  input?: unknown;
  output?: unknown;
  content?: string;
}

export interface ActivityGroup {
  id: string;
  messageId: string;
  title: string;
  isLatest: boolean;
  thinkingContent?: string;
  thinkingActive?: boolean;
  toolItems: ActivityItem[];
}

export interface ThinkingState {
  content: string;
  isComplete: boolean;
}
