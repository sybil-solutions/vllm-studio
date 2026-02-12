// CRITICAL
import { hashString } from "../../types";
import type { ParseOptions, ParsedMessage } from "../types";

export function createCacheHash(content: string, options: ParseOptions): string {
  const optionsKey = [options.extractArtifacts ?? "default", options.extractThinking ?? "default"].join(
    "-",
  );
  return hashString(`${content}:${optionsKey}`);
}

export function createEmptyParsedMessage(raw: string, isStreaming: boolean): ParsedMessage {
  return {
    raw,
    hash: "",
    thinking: { thinkingContent: null, mainContent: "", isThinkingComplete: true },
    artifacts: [],
    contentWithoutArtifacts: "",
    segments: [],
    isStreaming,
    parsedAt: Date.now(),
  };
}

