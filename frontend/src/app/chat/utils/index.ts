'use client';

import type { ChatMessage } from '@/store';
import type { ToolResult, StoredMessage, StoredToolCall } from '@/lib/types';

// Re-export ChatMessage as Message for convenience
export type Message = ChatMessage;

// OpenAI API types
export type OpenAIContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export type OpenAIToolCall = {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
};

export type OpenAIMessage =
  | {
      role: 'user' | 'assistant' | 'system';
      content: string | null | OpenAIContentPart[];
      tool_calls?: OpenAIToolCall[];
    }
  | { role: 'tool'; tool_call_id: string; name?: string; content: string };

// Types
export interface StreamEvent {
  type: 'text' | 'tool_calls' | 'done' | 'error';
  content?: string;
  tool_calls?: Array<{
    id: string;
    type: string;
    function: { name: string; arguments: string };
  }>;
  error?: string;
}

// Parse Server-Sent Events from a stream
export async function* parseSSEEvents(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<StreamEvent> {
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data) {
          try {
            yield JSON.parse(data) as StreamEvent;
          } catch {
            // Skip malformed JSON
          }
        }
      }
    }
  }
}

// Download text as file
export function downloadTextFile(filename: string, content: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Extract tool results from stored tool calls
export function extractToolResults(toolCalls: StoredToolCall[] = []): ToolResult[] {
  return toolCalls
    .filter((tc) => tc.result)
    .map((tc) => {
      const rawResult = tc.result;
      const content =
        typeof rawResult === 'string'
          ? rawResult
          : rawResult && typeof rawResult === 'object' && 'content' in rawResult
            ? String(rawResult.content ?? '')
            : rawResult != null
              ? JSON.stringify(rawResult)
              : '';
      const isError =
        rawResult && typeof rawResult === 'object' && 'isError' in rawResult
          ? Boolean((rawResult as { isError?: boolean }).isError)
          : undefined;
      return { tool_call_id: tc.id, content, isError };
    });
}

// Normalize a stored message to the Message type
export function normalizeStoredMessage(message: StoredMessage): Message {
  const toolCalls = message.tool_calls || [];
  const toolResults = extractToolResults(toolCalls);
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    model: message.model,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    toolResults: toolResults.length > 0 ? toolResults : undefined,
    prompt_tokens: message.prompt_tokens,
    completion_tokens: message.completion_tokens,
    total_tokens: message.total_tokens,
    request_prompt_tokens: message.request_prompt_tokens,
    request_tools_tokens: message.request_tools_tokens,
    request_total_input_tokens: message.request_total_input_tokens,
    request_completion_tokens: message.request_completion_tokens,
    estimated_cost_usd: message.estimated_cost_usd,
  };
}
