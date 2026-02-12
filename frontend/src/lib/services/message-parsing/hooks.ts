// CRITICAL
"use client";

/**
 * Message Parsing Hooks
 * React hooks for consuming the MessageParsingService
 */

import { useContext, useCallback } from "react";
import { MessageParsingContext } from "./context";
import { DEFAULT_CONFIG } from "./types";
import type {
  ParsedMessage,
  ParseOptions,
  ThinkingResult,
  ArtifactsResult,
  MarkdownSegment,
  ArtifactType,
  MessageParsingConfig,
} from "./types";

/**
 * Main hook for message parsing operations
 * Provides memoized callbacks for all parsing operations
 */
export function useMessageParsing() {
  const context = useContext(MessageParsingContext);
  const service = context?.service ?? null;
  const config: MessageParsingConfig = context?.config ?? DEFAULT_CONFIG;
  if (!service) {
    throw new Error("useMessageParsing must be used within a MessageParsingProvider");
  }

  const parse = useCallback(
    (content: string, options?: ParseOptions): ParsedMessage => {
      return service.parse(content, options);
    },
    [service],
  );

  const parseThinking = useCallback(
    (content: string): ThinkingResult => {
      return service.parseThinking(content);
    },
    [service],
  );

  const extractThinkingBlocks = useCallback(
    (content: string): Array<{ content: string; isComplete: boolean }> => {
      return service.extractThinkingBlocks(content);
    },
    [service],
  );

  const parseArtifacts = useCallback(
    (content: string): ArtifactsResult => {
      return service.parseArtifacts(content);
    },
    [service],
  );

  const stripTags = useCallback(
    (content: string): string => {
      return service.stripTags(content);
    },
    [service],
  );

  const getSegments = useCallback(
    (content: string): MarkdownSegment[] => {
      return service.getSegments(content);
    },
    [service],
  );

  const renderMarkdown = useCallback(
    (content: string): string => {
      return service.renderMarkdown(content);
    },
    [service],
  );

  const getArtifactType = useCallback(
    (language: string): ArtifactType | null => {
      return service.getArtifactType(language);
    },
    [service],
  );

  const getCached = useCallback(
    (content: string): ParsedMessage | null => {
      return service.getCached(content);
    },
    [service],
  );

  const invalidateCache = useCallback(
    (content?: string): void => {
      service.invalidateCache(content);
    },
    [service],
  );

  return {
    // Service instance
    service,
    config,

    // Parsing operations
    parse,
    parseThinking,
    extractThinkingBlocks,
    parseArtifacts,
    stripTags,
    getSegments,
    renderMarkdown,
    getArtifactType,

    // Cache operations
    getCached,
    invalidateCache,
    cacheSize: service.cacheSize,
  };
}

// Intentionally keep only the main `useMessageParsing()` hook to reduce API surface.
