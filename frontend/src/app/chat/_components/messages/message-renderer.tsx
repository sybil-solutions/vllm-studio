// CRITICAL
"use client";

import { memo, useEffect, useRef, useId, useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { EnhancedCodeBlock } from "../code/enhanced-code-block";
import { TypingIndicator, StreamingCursor } from "./typing-indicator";
import {
  useMessageParsing,
  thinkingParser,
} from "@/lib/services/message-parsing";
import type { MarkdownSegment, ThinkingResult } from "@/lib/services/message-parsing";
import {
  getMermaid,
  looksLikeMermaidDiagram,
  sanitizeMermaidCode,
} from "@/lib/mermaid";
import { useAppStore } from "@/store";

// Shared thinking parser exports
export { thinkingParser };
export type { ThinkingResult };
export function splitThinking(content: string): ThinkingResult {
  return thinkingParser.parse(content);
}

const EMPTY_MERMAID_STATE = { svg: "", error: null } as const;

interface MessageRendererProps {
  content: string;
  isStreaming?: boolean;
}

const MermaidDiagram = memo(function MermaidDiagram({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const id = useId().replace(/:/g, "_");
  const mermaidState = useAppStore((state) => state.mermaidState[id] ?? EMPTY_MERMAID_STATE);
  const setMermaidState = useAppStore((state) => state.setMermaidState);
  const deleteMermaidState = useAppStore((state) => state.deleteMermaidState);
  const { svg, error } = mermaidState;
  const renderSeqRef = useRef(0);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!code.trim()) return;

      const seq = ++renderSeqRef.current;

      if (!looksLikeMermaidDiagram(code)) {
        setMermaidState(
          id,
          "",
          "Not a valid Mermaid diagram (missing diagram header like `graph TD` or `sequenceDiagram`).",
        );
        return;
      }

      try {
        const mermaid = await getMermaid();
        if (!mermaid) {
          setMermaidState(id, "", "Failed to load mermaid library");
          return;
        }
        const sanitized = sanitizeMermaidCode(code);
        const { svg } = await mermaid.render(`mermaid_${id}_${seq}`, sanitized);
        if (seq !== renderSeqRef.current) return;
        setMermaidState(id, svg, null);
      } catch (e) {
        if (seq !== renderSeqRef.current) return;
        setMermaidState(id, "", e instanceof Error ? e.message : "Failed to render diagram");
      }
    };

    const handle = window.setTimeout(() => {
      renderDiagram();
    }, 250);
    return () => {
      window.clearTimeout(handle);
      deleteMermaidState(id);
    };
  }, [code, deleteMermaidState, id, setMermaidState]);

  if (error) {
    return (
      <div className="my-3 p-4 rounded-lg border border-red-500/30 bg-red-500/10">
        <div className="flex items-center gap-2 text-red-400 text-sm mb-2">
          <AlertCircle className="h-4 w-4" />
          <span>Diagram Error</span>
        </div>
        <div className="text-xs text-red-300 mb-2 break-words">{error}</div>
        <pre className="text-xs text-[#d8d4cd] overflow-x-auto">{code}</pre>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-3 p-4 rounded-lg border border-(--border) bg-(--card) overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
});

interface CodeBlockProps {
  segment: MarkdownSegment;
  isStreaming?: boolean;
}

const CodeBlock = memo(function CodeBlock({ segment, isStreaming }: CodeBlockProps) {
  const lang = segment.language || "";

  // Handle mermaid diagrams
  if (lang === "mermaid") {
    if (isStreaming) {
      return (
        <div className="my-3 p-4 rounded-lg border border-(--border) bg-(--card) animate-in fade-in">
          <div className="text-xs text-[#b8b4ad] mb-2">
            Mermaid preview renders after streaming completes.
          </div>
          <pre className="text-xs text-[#d8d4cd] overflow-x-auto">{segment.content}</pre>
        </div>
      );
    }
    return <MermaidDiagram code={segment.content} />;
  }

  // Use enhanced code block for everything else
  return (
    <EnhancedCodeBlock language={lang} isStreaming={isStreaming}>
      {segment.content}
    </EnhancedCodeBlock>
  );
});

interface MarkdownBlockProps {
  html: string;
}

const MarkdownBlock = memo(function MarkdownBlock({ html }: MarkdownBlockProps) {
  return <div className="chat-markdown" dangerouslySetInnerHTML={{ __html: html }} />;
});

function MessageRendererBase({ content, isStreaming }: MessageRendererProps) {
  const { service: parsingService, renderMarkdown } = useMessageParsing();

  const parsed = useMemo(() => {
    if (isStreaming) return null;
    return parsingService.parse(content, {
      isStreaming: false,
      extractArtifacts: false,
    });
  }, [parsingService, content, isStreaming]);

  const mainContent = parsed?.thinking.mainContent ?? content;
  const segments = parsed?.segments ?? [];
  const thinkingContent = parsed?.thinking.thinkingContent ?? null;
  const renderedMarkdown = useMemo(() => {
    if (isStreaming) return [];
    return segments.map((segment) =>
      segment.type === "code" ? null : renderMarkdown(segment.content),
    );
  }, [isStreaming, segments, renderMarkdown]);

  return (
    <div className="message-content min-w-0 break-words overflow-hidden max-w-full group relative text-inherit">
      {/* Main content */}
      {mainContent && (
        <div style={{ color: "#e8e4dd" }}>
          {isStreaming ? (
            (() => {
              const isCodeLike =
                mainContent.includes("```") ||
                mainContent.includes("<artifact") ||
                mainContent.includes("</artifact>");
              return (
                <div
                  className={`whitespace-pre-wrap break-words ${
                    isCodeLike ? "font-mono text-[13px]" : "text-[15px] leading-relaxed"
                  }`}
                >
                  {mainContent}
                </div>
              );
            })()
          ) : (
            segments.map((segment, index) => {
              if (segment.type === "code") {
                return (
                  <CodeBlock key={`code-${index}`} segment={segment} isStreaming={isStreaming} />
                );
              }

              const html = renderedMarkdown[index] ?? "";
              return <MarkdownBlock key={`md-${index}`} html={html} />;
            })
          )}
        </div>
      )}

      {/* Streaming indicators */}
      {!mainContent && !thinkingContent && isStreaming && (
        <div className="flex items-center gap-2">
          <TypingIndicator size="md" />
        </div>
      )}

      {mainContent && isStreaming && <StreamingCursor />}
    </div>
  );
}

function areMessageRendererPropsEqual(prev: MessageRendererProps, next: MessageRendererProps): boolean {
  return prev.content === next.content && prev.isStreaming === next.isStreaming;
}

export const MessageRenderer = memo(MessageRendererBase, areMessageRendererPropsEqual);
