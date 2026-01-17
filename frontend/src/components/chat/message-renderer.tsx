'use client';

import { useState, useMemo, useEffect, useRef, useId } from 'react';
import { AlertCircle } from 'lucide-react';
import mermaid from 'mermaid';
import { ArtifactRenderer } from './artifact-renderer';
import { EnhancedCodeBlock } from './enhanced-code-block';
import { TypingIndicator, StreamingCursor } from './typing-indicator';
import { MessageActions } from './message-actions';
import {
  useParsedMessage,
  useMessageParsing,
  thinkingParser,
} from '@/lib/services/message-parsing';
import type { Artifact, MarkdownSegment, ThinkingResult } from '@/lib/services/message-parsing';

// Re-export splitThinking for backward compatibility (used by ChatSidePanel)
export { thinkingParser };
export function splitThinking(content: string): ThinkingResult {
  return thinkingParser.parse(content);
}

// Initialize mermaid with dark theme
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'inherit',
  logLevel: 'fatal',
  suppressErrorRendering: true,
});

interface MessageRendererProps {
  content: string;
  isStreaming?: boolean;
  artifactsEnabled?: boolean;
  messageId?: string;
  showActions?: boolean;
}

function MermaidDiagram({ code }: { code: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const id = useId().replace(/:/g, '_');
  const renderSeqRef = useRef(0);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!code.trim()) return;

      const seq = ++renderSeqRef.current;

      const looksLikeMermaid =
        /^(?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|stateDiagram-v2|erDiagram|journey|gantt|pie|mindmap|timeline|gitGraph|C4Context|C4Container|C4Component|C4Dynamic|C4Deployment)\b/.test(
          code.trim()
        );
      if (!looksLikeMermaid) {
        setSvg('');
        setError('Not a valid Mermaid diagram (missing diagram header like `graph TD` or `sequenceDiagram`).');
        return;
      }

      try {
        const { svg } = await mermaid.render(`mermaid_${id}_${seq}`, code.trim());
        if (seq !== renderSeqRef.current) return;
        setSvg(svg);
        setError(null);
      } catch (e) {
        if (seq !== renderSeqRef.current) return;
        setError(e instanceof Error ? e.message : 'Failed to render diagram');
        setSvg('');
      }
    };

    const handle = window.setTimeout(() => {
      renderDiagram();
    }, 250);
    return () => window.clearTimeout(handle);
  }, [code, id]);

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
      className="my-3 p-4 rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

interface CodeBlockProps {
  segment: MarkdownSegment;
  artifactsEnabled?: boolean;
  isStreaming?: boolean;
}

function CodeBlock({ segment, artifactsEnabled, isStreaming }: CodeBlockProps) {
  const lang = segment.language || '';

  // Handle mermaid diagrams
  if (lang === 'mermaid') {
    if (isStreaming) {
      return (
        <div className="my-3 p-4 rounded-lg border border-[var(--border)] bg-[var(--card)] animate-in fade-in">
          <div className="text-xs text-[#b8b4ad] mb-2">Mermaid preview renders after streaming completes.</div>
          <pre className="text-xs text-[#d8d4cd] overflow-x-auto">{segment.content}</pre>
        </div>
      );
    }
    return <MermaidDiagram code={segment.content} />;
  }

  // Use enhanced code block for everything else
  return (
    <EnhancedCodeBlock
      language={lang}
      artifactsEnabled={artifactsEnabled}
      isStreaming={isStreaming}
    >
      {segment.content}
    </EnhancedCodeBlock>
  );
}

interface MarkdownBlockProps {
  html: string;
}

function MarkdownBlock({ html }: MarkdownBlockProps) {
  return (
    <div
      className="chat-markdown"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function MessageRenderer({
  content,
  isStreaming,
  artifactsEnabled,
  messageId,
  showActions = true,
}: MessageRendererProps) {
  // Use the parsing service with memoization
  const parsed = useParsedMessage(content, {
    isStreaming,
    extractArtifacts: artifactsEnabled,
  });

  const { renderMarkdown } = useMessageParsing();

  const { thinking, artifacts, segments } = parsed;
  const mainContent = thinking.mainContent;

  return (
    <div className="message-content min-w-0 break-words overflow-hidden max-w-full group relative text-inherit">
      {/* Message Actions */}
      {showActions && messageId && content && (
        <div className="absolute -top-2 right-0 z-10">
          <MessageActions content={content} messageId={messageId} />
        </div>
      )}

      {/* Main content */}
      {mainContent && (
        <div style={{ color: '#e8e4dd' }}>
          {segments.map((segment, index) => {
            if (segment.type === 'code') {
              return (
                <CodeBlock
                  key={`code-${index}`}
                  segment={segment}
                  artifactsEnabled={artifactsEnabled}
                  isStreaming={isStreaming}
                />
              );
            }

            const html = renderMarkdown(segment.content);
            return <MarkdownBlock key={`md-${index}`} html={html} />;
          })}
        </div>
      )}

      {/* Render explicit artifacts */}
      {artifacts.length > 0 && artifactsEnabled && (
        <div className="mt-3 space-y-3">
          {artifacts.map((artifact) => (
            <ArtifactRenderer
              key={artifact.id}
              artifact={artifact as Artifact}
            />
          ))}
        </div>
      )}

      {/* Streaming indicators */}
      {!mainContent && !thinking.thinkingContent && isStreaming && (
        <div className="flex items-center gap-2">
          <TypingIndicator size="md" />
        </div>
      )}

      {mainContent && isStreaming && (
        <StreamingCursor />
      )}
    </div>
  );
}
