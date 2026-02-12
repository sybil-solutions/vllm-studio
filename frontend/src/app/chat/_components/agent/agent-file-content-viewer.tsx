// CRITICAL
"use client";

import { useMemo, useState } from "react";
import { Check, Copy, File, FileCode, Image as ImageIcon, Loader2, X } from "lucide-react";
import type { AgentFileVersion } from "@/lib/types";
import { useMessageParsing } from "@/lib/services/message-parsing";
import {
  getFileExtension,
  getLanguageFromExt,
  isBase64,
  isImageFile,
  isPreviewableExt,
} from "./agent-file-metadata";
import { buildPreviewDocumentWithImports } from "./agent-file-previewer";
import { CodePreview } from "../code";
import { EnhancedCodeBlock } from "../code/enhanced-code-block";
import { MermaidDiagram } from "./agent-file-content-viewer/mermaid-diagram";

export function AgentFileContentViewer({
  path,
  content,
  versions,
  allFileVersions,
  loading,
  onClose,
  hasSession,
}: {
  path: string;
  content: string | null;
  versions: AgentFileVersion[];
  allFileVersions: Record<string, AgentFileVersion[]>;
  loading: boolean;
  onClose: () => void;
  hasSession: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const { service: parsingService, renderMarkdown } = useMessageParsing();
  const fileName = path.split("/").pop() || path;
  const ext = getFileExtension(fileName);
  const language = getLanguageFromExt(ext);
  const isImage = isImageFile(fileName) && ext !== "svg";
  const isMarkdown = ext === "md" || ext === "markdown";
  const previewable = isPreviewableExt(ext);
  const versionList = versions ?? [];
  const [activeTab, setActiveTab] = useState<"code" | "preview">(previewable ? "preview" : "code");
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  const activeVersion =
    (selectedVersion != null
      ? versionList.find((version) => version.version === selectedVersion)
      : null) ?? versionList[versionList.length - 1] ?? null;
  const displayContent = activeVersion?.content ?? content ?? "";

  const handleCopy = async () => {
    if (!displayContent) return;
    try {
      await navigator.clipboard.writeText(displayContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const lineCount = useMemo(() => {
    if (!displayContent) return 0;
    return displayContent.split("\n").length;
  }, [displayContent]);

  const markdownSegments = useMemo(() => {
    if (!isMarkdown) return [];
    return parsingService.parse(displayContent, {
      isStreaming: false,
      extractArtifacts: false,
      extractThinking: false,
    }).segments;
  }, [displayContent, isMarkdown, parsingService]);

  const previewDoc = useMemo(() => {
    // Avoid rebuilding iframe HTML unless the preview is actually being shown.
    if (!previewable || activeTab !== "preview") return "";
    if (isImage || isMarkdown) return "";
    return buildPreviewDocumentWithImports(ext, displayContent, path, allFileVersions);
  }, [activeTab, allFileVersions, displayContent, ext, isImage, isMarkdown, path, previewable]);

  return (
    <div className="flex flex-col h-full border-t border-white/6">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/6 bg-[#0c0c0c]">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode className="h-3.5 w-3.5 text-violet-400 shrink-0" />
          <span className="text-[11px] text-[#aaa] truncate font-mono">{fileName}</span>
          {!loading && displayContent && (
            <span className="text-[9px] text-[#555] shrink-0">{lineCount} lines</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!loading && displayContent && !isImage && (
            <button
              onClick={handleCopy}
              className="p-1 rounded hover:bg-white/5 text-[#555] hover:text-[#888] transition-colors"
              title="Copy content"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/5 text-[#555] hover:text-[#888] transition-colors"
            title="Close file"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {(versionList.length > 0 || previewable) && (
        <div className="px-3 py-2 border-b border-white/6 flex items-center gap-2 overflow-x-auto">
          {versionList.map((version) => (
            <button
              key={`${path}-${version.version}`}
              onClick={() => setSelectedVersion(version.version)}
              className={`px-2 py-1 rounded-md text-[10px] font-mono transition-colors ${
                version.version === activeVersion?.version
                  ? "bg-violet-500/15 text-violet-300 border border-violet-500/30"
                  : "bg-white/3 text-[#666] hover:text-[#888] border border-white/5"
              }`}
              title={new Date(version.timestamp).toLocaleTimeString()}
            >
              v{version.version}
            </button>
          ))}
          {previewable && (
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setActiveTab("preview")}
                className={`px-2 py-1 rounded text-[10px] ${
                  activeTab === "preview" ? "bg-white/8 text-foreground" : "text-[#666] hover:text-[#888]"
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setActiveTab("code")}
                className={`px-2 py-1 rounded text-[10px] ${
                  activeTab === "code" ? "bg-white/8 text-foreground" : "text-[#666] hover:text-[#888]"
                }`}
              >
                Code
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-auto bg-[#0a0a0a]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 text-violet-400 animate-spin" />
          </div>
        ) : content === null && versionList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <File className="h-6 w-6 text-[#333] mb-2" />
            <p className="text-xs text-[#555]">{hasSession ? "Failed to load file" : "Start a chat to view files"}</p>
          </div>
        ) : isImage ? (
          <div className="flex items-center justify-center p-4 h-full">
            {isBase64(displayContent) ? (
              <img
                src={`data:image/${ext};base64,${displayContent}`}
                alt={fileName}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-center px-4">
                <ImageIcon className="h-8 w-8 text-[#2a2725] mb-3" />
                <p className="text-xs text-[#555]">Binary image file</p>
                <p className="text-[10px] text-[#444]">Preview not available</p>
              </div>
            )}
          </div>
        ) : isMarkdown && activeTab === "preview" ? (
          <div className="p-4">
            <div className="text-[13px] leading-relaxed">
              {markdownSegments.map((segment, idx) => {
                if (segment.type === "code") {
                  const lang = (segment.language || "").toLowerCase();
                  if (lang === "mermaid") return <MermaidDiagram key={`mmd-${idx}`} code={segment.content} />;
                  return (
                    <EnhancedCodeBlock key={`code-${idx}`} language={lang} isStreaming={false}>
                      {segment.content}
                    </EnhancedCodeBlock>
                  );
                }
                const html = renderMarkdown(segment.content);
                return (
                  <div
                    key={`md-${idx}`}
                    className="chat-markdown"
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                );
              })}
            </div>
          </div>
        ) : previewable && activeTab === "preview" ? (
          <div className="w-full h-full bg-[#0a0a0a]">
            <iframe
              srcDoc={previewDoc}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms"
              title={`${fileName} preview`}
            />
          </div>
        ) : (
          <CodePreview code={displayContent} language={language} className="text-[11px] text-[#e6e2dd]" />
        )}
      </div>
    </div>
  );
}
