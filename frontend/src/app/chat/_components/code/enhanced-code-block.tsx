// CRITICAL
"use client";

import { useCallback, useEffect, useId } from "react";
import * as Icons from "../icons";
import { CodePreview } from "./code-preview";
import { useAppStore } from "@/store";
import { DEFAULT_CODE_BLOCK_ENTRY } from "@/store/chat-slice-defaults";

interface EnhancedCodeBlockProps {
  children: string;
  className?: string;
  isStreaming?: boolean;
  language?: string;
}

export function EnhancedCodeBlock({
  children,
  className,
  language,
  isStreaming,
}: EnhancedCodeBlockProps) {
  const blockId = useId();
  const blockState = useAppStore(
    (state) =>
      state.codeBlockState[blockId] ?? DEFAULT_CODE_BLOCK_ENTRY,
  );
  const updateCodeBlockState = useAppStore((state) => state.updateCodeBlockState);
  const deleteCodeBlockState = useAppStore((state) => state.deleteCodeBlockState);
  const { copied, isExpanded } = blockState;

  // Prevent `codeBlockState` from growing unbounded as Virtuoso mounts/unmounts blocks.
  useEffect(() => {
    return () => deleteCodeBlockState(blockId);
  }, [blockId, deleteCodeBlockState]);

  const lang = language || className?.replace("language-", "") || "text";
  const code = String(children).replace(/\n$/, "");

  const setCopied = useCallback(
    (value: boolean) => {
      updateCodeBlockState(blockId, (prev) => ({ ...prev, copied: value }));
    },
    [blockId, updateCodeBlockState],
  );

  const setExpanded = useCallback(
    (value: boolean) => {
      updateCodeBlockState(blockId, (prev) => ({ ...prev, isExpanded: value }));
    },
    [blockId, updateCodeBlockState],
  );

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code, setCopied]);

  if (isStreaming) {
    return (
      <div className="my-3 rounded-xl overflow-hidden border border-(--border) bg-(--surface)/90 shadow-sm">
        <div className="flex items-center justify-between bg-(--surface)/80 backdrop-blur-sm px-4 py-2.5 border-b border-(--border)">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
              <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
            </div>
            <span className="text-xs font-mono font-medium text-(--dim) bg-(--bg) px-2 py-0.5 rounded">
              {lang || "code"}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={copyCode}
              className="p-1.5 rounded-lg hover:bg-(--surface) transition-all duration-200 text-(--dim) hover:text-(--fg)"
              title="Copy code"
            >
              {copied ? (
                <Icons.Check className="h-3.5 w-3.5 text-(--hl2)" />
              ) : (
                <Icons.Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        <pre className="px-4 py-3 text-sm leading-relaxed font-mono text-(--fg) bg-transparent overflow-x-auto whitespace-pre">
          {code}
        </pre>
      </div>
    );
  }

  const lineCount = code.split("\n").length;
  const isLongCode = lineCount > 20;
  const shouldCollapse = isLongCode && !isExpanded;

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-(--border) bg-(--surface)/90 shadow-sm transition-all duration-200 hover:shadow-md group">
      {/* Header */}
      <div className="flex items-center justify-between bg-(--surface)/80 backdrop-blur-sm px-4 py-2.5 border-b border-(--border)">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
          </div>
          <span className="text-xs font-mono font-medium text-(--dim) bg-(--bg) px-2 py-0.5 rounded">
            {lang || "code"}
          </span>
          {isLongCode && <span className="text-xs text-(--dim)">{lineCount} lines</span>}
        </div>

        <div className="flex items-center gap-1">
          {isLongCode && (
            <button
              onClick={() => setExpanded(!isExpanded)}
              className="p-1.5 rounded-lg hover:bg-(--surface) transition-all duration-200 text-(--dim) hover:text-(--fg)"
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <Icons.Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Icons.Maximize2 className="h-3.5 w-3.5" />
              )}
            </button>
          )}

          <button
            onClick={copyCode}
            className="p-1.5 rounded-lg hover:bg-(--surface) transition-all duration-200 text-(--dim) hover:text-(--fg)"
            title="Copy code"
          >
            {copied ? (
              <Icons.Check className="h-3.5 w-3.5 text-(--hl2)" />
            ) : (
              <Icons.Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Code */}
      <div className={shouldCollapse ? "max-h-[300px] overflow-hidden relative" : ""}>
        <CodePreview code={code} language={lang} />

        {shouldCollapse && (
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-(--surface) to-transparent flex items-end justify-center pb-3">
            <button
              onClick={() => setExpanded(true)}
              className="text-xs text-(--dim) hover:text-(--fg) transition-colors flex items-center gap-1"
            >
              Expand full code
              <Icons.Maximize2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
