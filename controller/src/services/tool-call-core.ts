// CRITICAL
import { randomUUID } from "node:crypto";

export interface ToolCall {
  index: number;
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface StreamUsage {
  prompt_tokens: number;
  completion_tokens: number;
}

export const createToolCallId = (): string => `call_${randomUUID().replace(/-/g, "").slice(0, 9)}`;

type ThinkingStreamState = {
  pendingTag: string;
  inThinking: boolean;
  // Some models (e.g. minimax-m2.*) may emit a closing </think> without an opening tag.
  // When enabled, we treat the leading stream prefix as reasoning until the first close tag.
  assumeLeadingReasoning: boolean;
  sawOpeningTag: boolean;
  sawAnyThinking: boolean;
  sawVisibleText: boolean;
};

type ThinkTagStripState = {
  pendingTag: string;
};

const THINK_OPEN_TAGS = ["<think>", "<thinking>"];
const THINK_CLOSE_TAGS = ["</think>", "</thinking>"];
const TOOL_CALL_TAG_RE = /<tool_call|<use_mcp_tool/i;

const MAX_THINK_TAG_LEN = Math.max(
  ...THINK_OPEN_TAGS.map((t) => t.length),
  ...THINK_CLOSE_TAGS.map((t) => t.length)
);

const looksLikeThinkTagPrefix = (value: string): boolean => {
  if (!value.startsWith("<")) return false;
  const lower = value.toLowerCase();
  return [...THINK_OPEN_TAGS, ...THINK_CLOSE_TAGS].some((tag) => tag.startsWith(lower));
};

const splitTrailingThinkPrefix = (value: string): { head: string; pending: string } => {
  const lastLt = value.lastIndexOf("<");
  if (lastLt === -1) return { head: value, pending: "" };
  const suffix = value.slice(lastLt);
  if (suffix.length >= MAX_THINK_TAG_LEN) return { head: value, pending: "" };
  if (!looksLikeThinkTagPrefix(suffix)) return { head: value, pending: "" };
  return { head: value.slice(0, lastLt), pending: suffix };
};

const extractThinkingFromText = (
  chunk: string,
  state: ThinkingStreamState
): { content: string; reasoning: string } => {
  if (!chunk && !state.pendingTag) return { content: "", reasoning: "" };

  const combined = `${state.pendingTag}${chunk || ""}`;
  state.pendingTag = "";

  const { head, pending } = splitTrailingThinkPrefix(combined);
  state.pendingTag = pending;

  if (!head) return { content: "", reasoning: "" };

  const visible: string[] = [];
  const reasoning: string[] = [];
  let remaining = head;

  while (remaining) {
    const lower = remaining.toLowerCase();

    const openIdxs = THINK_OPEN_TAGS.map((t) => lower.indexOf(t)).filter((index) => index !== -1);
    const closeIdxs = THINK_CLOSE_TAGS.map((t) => lower.indexOf(t)).filter((index) => index !== -1);
    const openIndex = openIdxs.length ? Math.min(...openIdxs) : -1;
    const closeIndex = closeIdxs.length ? Math.min(...closeIdxs) : -1;

    if (openIndex === -1 && closeIndex === -1) {
      if (state.inThinking) reasoning.push(remaining);
      else visible.push(remaining);
      break;
    }

    const isOpenNext = openIndex !== -1 && (closeIndex === -1 || openIndex < closeIndex);

    if (isOpenNext) {
      if (openIndex > 0) {
        const before = remaining.slice(0, openIndex);
        if (state.inThinking) reasoning.push(before);
        else visible.push(before);
      }

      const matchedOpen = THINK_OPEN_TAGS.find((t) => lower.startsWith(t, openIndex))!;
      remaining = remaining.slice(openIndex + matchedOpen.length);

      state.inThinking = true;
      state.sawOpeningTag = true;
      state.sawAnyThinking = true;
      continue;
    }

    // Closing tag without explicit opening (minimax m2.1 may omit the opening tag)
    if (closeIndex > 0) {
      const before = remaining.slice(0, closeIndex);
      const treatAsThinking =
        state.inThinking ||
        (state.assumeLeadingReasoning && !state.sawOpeningTag && !state.sawVisibleText);
      if (treatAsThinking) reasoning.push(before);
      else visible.push(before);
    }

    const matchedClose = THINK_CLOSE_TAGS.find((t) => lower.startsWith(t, closeIndex))!;
    remaining = remaining.slice(closeIndex + matchedClose.length);

    state.inThinking = false;
    state.assumeLeadingReasoning = false;
    state.sawAnyThinking = true;
  }

  const visibleText = visible.join("");
  if (!state.sawVisibleText && /\S/.test(visibleText)) {
    state.sawVisibleText = true;
  }

  return { content: visibleText, reasoning: reasoning.join("") };
};

const stripThinkingTagsFromText = (chunk: string, state: ThinkTagStripState): string => {
  if (!chunk && !state.pendingTag) return "";

  const combined = `${state.pendingTag}${chunk || ""}`;
  state.pendingTag = "";

  const { head, pending } = splitTrailingThinkPrefix(combined);
  state.pendingTag = pending;

  if (!head) return "";

  // Remove only <think>/<thinking> tags; keep inner content.
  return head.replace(/<\/?think(?:ing)?>/gi, "");
};

const safeJsonParse = (value: string): unknown | null => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const coerceArguments = (value: unknown): string => {
  if (typeof value === "string") {
    return value.trim();
  }
  if (value === undefined || value === null) {
    return "{}";
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "{}";
  }
};

const parseParameterBlocks = (block: string): Record<string, unknown> | null => {
  const args: Record<string, unknown> = {};
  const parameterPattern = /<parameter(?:\s+name=|=)([^>\s]+)>([\s\S]*?)<\/parameter>/gi;
  let found = false;
  for (const match of block.matchAll(parameterPattern)) {
    const name = String(match[1] ?? "")
      .replace(/["']/g, "")
      .trim();
    if (!name) continue;
    found = true;
    const rawValue = String(match[2] ?? "").trim();
    const parsed =
      rawValue && (rawValue.startsWith("{") || rawValue.startsWith("["))
        ? safeJsonParse(rawValue)
        : null;
    args[name] = parsed ?? rawValue;
  }
  return found ? args : null;
};

const buildToolCall = (name: string, args: unknown, index: number): ToolCall => ({
  index,
  id: createToolCallId(),
  type: "function",
  function: { name, arguments: coerceArguments(args) },
});

export const normalizeToolRequest = (payload: Record<string, unknown>): Record<string, unknown> => {
  if (payload["functions"] && !payload["tools"] && Array.isArray(payload["functions"])) {
    payload["tools"] = (payload["functions"] as Array<Record<string, unknown>>).map(
      (functionDefinition) => ({
        type: "function",
        function: functionDefinition,
      })
    );
    delete payload["functions"];
  }
  return payload;
};

export const parseToolCallsFromContent = (content: string): ToolCall[] => {
  if (!content) return [];
  const toolCalls: ToolCall[] = [];

  const mcpPattern =
    /<?use_mcp_tool>\s*<?server_name>([^<]*)<\/server_name>\s*<?tool_name>([^<]*)<\/tool_name>\s*<?arguments>\s*([\s\S]*?)\s*<\/arguments>\s*<\/use_mcp[\s_]*tool>/gi;
  for (const match of content.matchAll(mcpPattern)) {
    const server = String(match[1] ?? "").trim();
    const tool = String(match[2] ?? "").trim();
    const argsRaw = String(match[3] ?? "").trim();
    if (!tool) continue;
    const argsParsed = argsRaw ? (safeJsonParse(argsRaw) ?? argsRaw) : {};
    const name = server ? `${server}__${tool}` : tool;
    toolCalls.push(buildToolCall(name, argsParsed, toolCalls.length));
  }

  const toolCallPattern = /<tool_call>([\s\S]*?)<\/tool_call>/gi;
  for (const match of content.matchAll(toolCallPattern)) {
    const block = String(match[1] ?? "");
    const functionMatch = block.match(/<function(?:=|\s+name=)([^>\s]+)[^>]*>/i);
    const toolName = functionMatch ? String(functionMatch[1]).replace(/["']/g, "").trim() : "";
    const argsMatch = block.match(/<arguments>([\s\S]*?)<\/arguments>/i);
    let args: unknown = argsMatch ? String(argsMatch[1] ?? "").trim() : null;
    if (typeof args === "string" && args) {
      const parsed = safeJsonParse(args);
      args = parsed ?? args;
    } else {
      args = parseParameterBlocks(block);
    }

    if (!toolName) {
      const jsonCandidate = block.match(/\{[\s\S]*\}/);
      const parsed = jsonCandidate ? safeJsonParse(jsonCandidate[0]) : null;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const name = String((parsed as Record<string, unknown>)["name"] ?? "").trim();
        const argumentsValue = (parsed as Record<string, unknown>)["arguments"];
        if (name) {
          toolCalls.push(buildToolCall(name, argumentsValue ?? {}, toolCalls.length));
          continue;
        }
      }
      continue;
    }

    toolCalls.push(buildToolCall(toolName, args ?? {}, toolCalls.length));
  }

  if (toolCalls.length === 0) {
    const jsonPattern = /\{"name"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*(\{[\s\S]*?\})\s*\}/g;
    for (const match of content.matchAll(jsonPattern)) {
      const name = String(match[1] ?? "").trim();
      const argsRaw = String(match[2] ?? "").trim();
      const parsedArguments = argsRaw ? (safeJsonParse(argsRaw) ?? argsRaw) : {};
      if (name) {
        toolCalls.push(buildToolCall(name, parsedArguments, toolCalls.length));
      }
    }
  }

  return toolCalls;
};

export const stripToolCallMarkup = (content: string): string => {
  let result = content;
  const hadXml = /<tool_call>|<use_mcp_tool>/i.test(content);
  result = result.replace(/<use_mcp_tool>[\s\S]*?<\/use_mcp[\s_]*tool>/gi, "");
  result = result.replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, "");
  if (!hadXml) {
    result = result.replace(
      /\{"name"\s*:\s*"[^"]+"\s*,\s*"arguments"\s*:\s*\{[\s\S]*?\}\s*\}/g,
      ""
    );
  }
  // Tools sometimes embed <think> blocks inside the XML tool markup.
  // We strip those tags too to avoid leaking them into visible content.
  result = result.replace(/<\/?think(?:ing)?>/gi, "");
  return result.trim();
};

export const normalizeToolCallsInMessage = (message: Record<string, unknown>): boolean => {
  const existing = message["tool_calls"];
  const hasToolCalls = Array.isArray(existing) && existing.length > 0;
  if (hasToolCalls) {
    return false;
  }
  const content = typeof message["content"] === "string" ? String(message["content"]) : "";
  const reasoning =
    typeof message["reasoning_content"] === "string" ? String(message["reasoning_content"]) : "";
  const parsed = parseToolCallsFromContent(`${content}${reasoning}`);
  if (parsed.length > 0) {
    message["tool_calls"] = parsed;
    if (content) {
      const stripped = stripToolCallMarkup(content);
      message["content"] = stripped || null;
    }
    return true;
  }
  return false;
};

export const createToolCallStream = (
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onUsage?: (usage: StreamUsage) => void
): ReadableStream<Uint8Array> => {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  let contentBuffer = "";
  let toolCallsFound = false;
  let usageTracked = false;
  let bufferingToolCall = false;
  let pendingLines: string[] = [];
  const TOOL_CALL_START_RE = /<tool_call|<use_mcp_tool/i;

  const thinkingState: ThinkingStreamState = {
    pendingTag: "",
    inThinking: false,
    assumeLeadingReasoning: true,
    sawOpeningTag: false,
    sawAnyThinking: false,
    sawVisibleText: false,
  };

  const toolMarkupThinkingStripState: ThinkTagStripState = { pendingTag: "" };

  const enqueueLine = (
    controller: ReadableStreamDefaultController<Uint8Array>,
    line: string
  ): void => {
    controller.enqueue(encoder.encode(`${line}\n`));
  };

  const buildToolCallChunk = (toolCalls: ToolCall[]): string => {
    const payload = {
      id: `chatcmpl-${randomUUID().slice(0, 8)}`,
      choices: [
        {
          index: 0,
          delta: { tool_calls: toolCalls },
          finish_reason: "tool_calls",
        },
      ],
    };
    return `data: ${JSON.stringify(payload)}`;
  };

  const parseUsage = (data: Record<string, unknown>): void => {
    if (usageTracked || !onUsage) return;
    const usage = data["usage"] as Record<string, number> | undefined;
    if (usage && (usage["prompt_tokens"] || usage["completion_tokens"])) {
      onUsage({
        prompt_tokens: usage["prompt_tokens"] ?? 0,
        completion_tokens: usage["completion_tokens"] ?? 0,
      });
      usageTracked = true;
    }
  };

  const absorbDeltaContent = (data: Record<string, unknown>): void => {
    const choices = data["choices"];
    if (!Array.isArray(choices)) return;
    for (const choice of choices) {
      const choiceRecord = choice as Record<string, unknown>;
      const delta = (choiceRecord["delta"] ?? choiceRecord["message"]) as
        | Record<string, unknown>
        | undefined;
      if (!delta) continue;
      const toolCalls = delta["tool_calls"];
      if (Array.isArray(toolCalls) && toolCalls.length > 0) {
        toolCallsFound = true;
      }

      const content = typeof delta["content"] === "string" ? String(delta["content"]) : "";
      const reasoning =
        typeof delta["reasoning_content"] === "string" ? String(delta["reasoning_content"]) : "";

      // Collect content for tool-call parsing. If the stream is already emitting tool-call markup,
      // strip any <think> tags so they don't leak into UI.
      if (content) {
        if (bufferingToolCall || toolCallsFound || TOOL_CALL_START_RE.test(contentBuffer)) {
          contentBuffer += stripThinkingTagsFromText(content, toolMarkupThinkingStripState);
        } else {
          contentBuffer += content;
        }
      }

      if (reasoning) contentBuffer += reasoning;
    }
  };

  const rewriteThinkingInChunk = (parsed: Record<string, unknown>): boolean => {
    const choices = parsed["choices"];
    if (!Array.isArray(choices)) return false;

    let changed = false;

    for (const choice of choices) {
      const choiceRecord = choice as Record<string, unknown>;
      const delta = (choiceRecord["delta"] ?? choiceRecord["message"]) as
        | Record<string, unknown>
        | undefined;
      if (!delta) continue;

      const rawContent = typeof delta["content"] === "string" ? String(delta["content"]) : "";
      if (!rawContent && !thinkingState.pendingTag) continue;

      // Never try to reinterpret/strip think tags inside tool-call markup; we only want to
      // handle plain text model output and the minimax missing-opening-tag quirk.
      if (TOOL_CALL_TAG_RE.test(rawContent) || TOOL_CALL_TAG_RE.test(thinkingState.pendingTag)) {
        continue;
      }

      const split = extractThinkingFromText(rawContent, thinkingState);
      if (split.reasoning) {
        const existing =
          typeof delta["reasoning_content"] === "string" ? String(delta["reasoning_content"]) : "";
        delta["reasoning_content"] = `${existing}${split.reasoning}`;
        changed = true;
      }
      if (split.content !== rawContent) {
        delta["content"] = split.content;
        changed = true;
      }
    }

    return changed;
  };

  const finalizeToolCalls = (controller: ReadableStreamDefaultController<Uint8Array>): void => {
    if (!toolCallsFound && contentBuffer) {
      const parsed = parseToolCallsFromContent(contentBuffer);
      if (parsed.length > 0) {
        enqueueLine(controller, buildToolCallChunk(parsed));
        toolCallsFound = true;
      }
    }
    if (toolCallsFound) {
      // Suppress pending lines — they contain tool call markup
    } else {
      for (const pl of pendingLines) {
        enqueueLine(controller, pl);
      }
    }
    pendingLines = [];
  };

  type ReaderResult = { done: boolean; value?: Uint8Array | undefined };

  return new ReadableStream<Uint8Array>({
    async pull(controller): Promise<void> {
      let result: ReaderResult;
      try {
        result = await reader.read();
      } catch {
        controller.close();
        return;
      }

      let emitted = false;
      const enqueue = (line: string): void => {
        enqueueLine(controller, line);
        emitted = true;
      };

      if (result.done) {
        if (buffer.trim()) {
          if (bufferingToolCall) {
            pendingLines.push(buffer);
          } else {
            enqueue(buffer);
          }
          buffer = "";
        }
        finalizeToolCalls(controller);
        controller.close();
        return;
      }

      const chunk = result.value ?? new Uint8Array();
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            finalizeToolCalls(controller);
            enqueue("data: [DONE]");
            continue;
          }
          if (data) {
            try {
              const parsed = JSON.parse(data) as Record<string, unknown>;
              parseUsage(parsed);
              absorbDeltaContent(parsed);

              const rewrote = rewriteThinkingInChunk(parsed);
              if (rewrote) {
                const rebuilt = `data: ${JSON.stringify(parsed)}`;
                if (
                  !bufferingToolCall &&
                  !toolCallsFound &&
                  TOOL_CALL_START_RE.test(contentBuffer)
                ) {
                  bufferingToolCall = true;
                }
                if (bufferingToolCall) {
                  pendingLines.push(rebuilt);
                } else {
                  enqueue(rebuilt);
                }
                continue;
              }
            } catch {
              // passthrough
            }
          }
        }

        if (!bufferingToolCall && !toolCallsFound && TOOL_CALL_START_RE.test(contentBuffer)) {
          bufferingToolCall = true;
        }

        // Keep the stream flowing even when buffering tool-call markup.
        if (!line.trim()) {
          enqueue(line);
          continue;
        }

        if (bufferingToolCall) {
          pendingLines.push(line);
        } else {
          enqueue(line);
        }
      }

      if (!emitted && bufferingToolCall) {
        enqueue("");
      }
    },
    async cancel(): Promise<void> {
      await reader.cancel();
    },
  });
};
