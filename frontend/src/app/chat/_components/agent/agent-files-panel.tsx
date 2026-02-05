// CRITICAL
"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import {
  Folder,
  File,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  FileCode,
  FileText,
  FileJson,
  Image as ImageIcon,
  Terminal,
  X,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import type { AgentFileEntry, AgentFileVersion } from "@/lib/types";
import { useMessageParsing } from "@/lib/services/message-parsing";
import type { AgentPlan } from "./agent-types";
import { CodePreview } from "../code";
import {
  buildSvgDocument,
  buildReactDocument,
  buildJsDocument,
  buildHtmlDocument,
  buildTextDocument,
} from "../artifacts/artifact-templates";

interface AgentFilesPanelProps {
  files: AgentFileEntry[];
  fileVersions: Record<string, AgentFileVersion[]>;
  plan?: AgentPlan | null;
  selectedFilePath: string | null;
  selectedFileContent: string | null;
  selectedFileLoading: boolean;
  onSelectFile: (path: string | null) => void;
  hasSession: boolean;
}

function getFileExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function fileIcon(name: string) {
  const ext = getFileExtension(name);
  if (["ts", "tsx", "js", "jsx", "py", "rs", "go", "rb", "java", "c", "cpp", "h", "css", "scss", "html"].includes(ext))
    return FileCode;
  if (["json", "yaml", "yml", "toml", "xml"].includes(ext)) return FileJson;
  if (["md", "txt", "csv", "log", "env"].includes(ext)) return FileText;
  if (["png", "jpg", "jpeg", "gif", "svg", "webp", "ico"].includes(ext)) return ImageIcon;
  return File;
}

function getLanguageFromExt(ext: string): string {
  const langMap: Record<string, string> = {
    ts: "typescript",
    tsx: "tsx",
    js: "javascript",
    jsx: "jsx",
    py: "python",
    rs: "rust",
    go: "go",
    rb: "ruby",
    java: "java",
    c: "c",
    cpp: "cpp",
    h: "c",
    css: "css",
    scss: "scss",
    html: "html",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    xml: "xml",
    md: "markdown",
    txt: "plaintext",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    sql: "sql",
  };
  return langMap[ext] || "plaintext";
}

function isImageFile(name: string): boolean {
  const ext = getFileExtension(name);
  return ["png", "jpg", "jpeg", "gif", "svg", "webp", "ico"].includes(ext);
}

function isBase64(str: string): boolean {
  if (!str || str.length < 16) return false;
  if (str.length > 5_000_000) return false;
  if (str.includes("\n") || str.includes("\r")) return false;
  // Avoid false positives for plain text by requiring plausible padding and length.
  if (str.length % 4 !== 0) return false;
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  return base64Regex.test(str);
}

function isPreviewableExt(ext: string): boolean {
  return ["html", "svg", "js", "jsx", "ts", "tsx", "mjs", "cjs", "md", "markdown"].includes(ext);
}

function buildFilePath(entry: AgentFileEntry, parentPath: string): string {
  return parentPath ? `${parentPath}/${entry.name}` : entry.name;
}

function stripQueryAndHash(value: string): string {
  return value.split("?")[0]?.split("#")[0] ?? value;
}

// Resolve a relative path from a base path
function resolvePath(basePath: string, relativePath: string): string {
  const cleaned = stripQueryAndHash(relativePath).trim();
  if (cleaned.startsWith("/")) {
    return cleaned.replace(/^\/+/, "");
  }
  // Get directory of base file
  const baseDir = basePath.includes("/") ? basePath.substring(0, basePath.lastIndexOf("/")) : "";

  // Handle ./ prefix
  let resolved = cleaned.replace(/^\.\//, "");

  // Handle ../ prefixes
  const parts = baseDir.split("/").filter(Boolean);
  while (resolved.startsWith("../")) {
    parts.pop();
    resolved = resolved.substring(3);
  }

  return parts.length > 0 ? `${parts.join("/")}/${resolved}` : resolved;
}

function isLocalImportSpecifier(spec: string): boolean {
  if (!spec) return false;
  if (spec.startsWith("http://") || spec.startsWith("https://") || spec.startsWith("//")) return false;
  if (spec.startsWith("data:") || spec.startsWith("blob:")) return false;
  if (spec.startsWith("./") || spec.startsWith("../") || spec.startsWith("/")) return true;
  // Treat extension-based specifiers as local (e.g., "app.js")
  return /\.[a-z0-9]+$/i.test(spec);
}

function encodeBase64(value: string): string {
  try {
    if (typeof TextEncoder !== "undefined") {
      const bytes = new TextEncoder().encode(value);
      let binary = "";
      for (const byte of bytes) {
        binary += String.fromCharCode(byte);
      }
      if (typeof btoa === "function") return btoa(binary);
      const maybeBuffer = (globalThis as { Buffer?: { from: (data: Uint8Array) => { toString: (enc: string) => string } } })
        .Buffer;
      if (maybeBuffer) return maybeBuffer.from(bytes).toString("base64");
    }
  } catch {
    // fallthrough
  }
  try {
    const maybeBuffer = (globalThis as { Buffer?: { from: (data: string, enc: string) => { toString: (enc: string) => string } } })
      .Buffer;
    if (maybeBuffer) return maybeBuffer.from(value, "utf-8").toString("base64");
  } catch {
    // fallthrough
  }
  return "";
}

function makeDataUrl(code: string, mime: string): string {
  const base64 = encodeBase64(code);
  if (base64) return `data:${mime};base64,${base64}`;
  return `data:${mime};charset=utf-8,${encodeURIComponent(code)}`;
}

function createModuleResolver(allFileVersions: Record<string, AgentFileVersion[]>) {
  const cache = new Map<string, string>();
  const inProgress = new Set<string>();
  const moduleExts = new Set(["js", "mjs", "jsx"]);

  function resolveModulePath(fromPath: string, spec: string): string | null {
    if (!isLocalImportSpecifier(spec)) return null;
    const cleaned = stripQueryAndHash(spec);
    const resolved = resolvePath(fromPath, cleaned);

    if (getFileContent(resolved, allFileVersions)) return resolved;

    const withJs = `${resolved}.js`;
    if (getFileContent(withJs, allFileVersions)) return withJs;

    const withMjs = `${resolved}.mjs`;
    if (getFileContent(withMjs, allFileVersions)) return withMjs;

    const withJsx = `${resolved}.jsx`;
    if (getFileContent(withJsx, allFileVersions)) return withJsx;

    const withIndex = `${resolved}/index.js`;
    if (getFileContent(withIndex, allFileVersions)) return withIndex;

    return getFileContent(resolved, allFileVersions) ? resolved : null;
  }

  function rewriteImports(code: string, fromPath: string): string {
    let result = code;

    const replacer = (match: string, prefix: string, quote: string, spec: string, suffix: string) => {
      if (!isLocalImportSpecifier(spec)) return match;
      const resolved = resolveModulePath(fromPath, spec);
      if (!resolved) return match;
      const url = buildDataUrlForPath(resolved);
      if (!url) return match;
      return `${prefix}${quote}${url}${quote}${suffix}`;
    };

    result = result.replace(
      /(import\s*\(\s*)(['"])([^'"]+)\2(\s*\))/g,
      replacer,
    );

    result = result.replace(
      /(import\s+[^'"]*?\s+from\s+)(['"])([^'"]+)\2/g,
      (match, prefix, quote, spec) => replacer(match, prefix, quote, spec, ""),
    );

    result = result.replace(
      /(export\s+[^'"]*?\s+from\s+)(['"])([^'"]+)\2/g,
      (match, prefix, quote, spec) => replacer(match, prefix, quote, spec, ""),
    );

    result = result.replace(
      /(import\s+)(['"])([^'"]+)\2/g,
      (match, prefix, quote, spec) => replacer(match, prefix, quote, spec, ""),
    );

    return result;
  }

  function buildDataUrlForPath(path: string): string | null {
    const ext = getFileExtension(path);
    if (!moduleExts.has(ext)) return null;
    if (cache.has(path)) return cache.get(path) ?? null;
    if (inProgress.has(path)) return null;
    const content = getFileContent(path, allFileVersions);
    if (content == null) return null;
    inProgress.add(path);
    const rewritten = rewriteImports(content, path);
    const dataUrl = makeDataUrl(rewritten, "text/javascript");
    cache.set(path, dataUrl);
    inProgress.delete(path);
    return dataUrl;
  }

  return {
    rewriteImports,
  };
}

// Get latest content for a file path from versions
function getFileContent(path: string, allFileVersions: Record<string, AgentFileVersion[]>): string | null {
  const versions = allFileVersions[path];
  if (!versions || versions.length === 0) return null;
  return versions[versions.length - 1].content;
}

// Inline local CSS and JS imports in HTML content
function inlineLocalImports(
  htmlContent: string,
  currentPath: string,
  allFileVersions: Record<string, AgentFileVersion[]>
): string {
  let result = htmlContent;
  const moduleResolver = createModuleResolver(allFileVersions);

  // Inline <link rel="stylesheet" href="..."> tags
  result = result.replace(
    /<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*\/?>/gi,
    (match, href) => {
      // Skip external URLs
      if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("//")) {
        return match;
      }
      const resolvedPath = resolvePath(currentPath, href);
      const cssContent = getFileContent(resolvedPath, allFileVersions);
      if (cssContent) {
        return `<style>/* Inlined from ${href} */\n${cssContent}</style>`;
      }
      return match;
    }
  );

  // Also handle href before rel
  result = result.replace(
    /<link\s+[^>]*href=["']([^"']+)["'][^>]*rel=["']stylesheet["'][^>]*\/?>/gi,
    (match, href) => {
      if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("//")) {
        return match;
      }
      const resolvedPath = resolvePath(currentPath, href);
      const cssContent = getFileContent(resolvedPath, allFileVersions);
      if (cssContent) {
        return `<style>/* Inlined from ${href} */\n${cssContent}</style>`;
      }
      return match;
    }
  );

  // Inline <script src="..."> tags (non-module)
  result = result.replace(
    /<script\s+([^>]*?)src=["']([^"']+)["']([^>]*)><\/script>/gi,
    (match, beforeAttrs, src, afterAttrs) => {
      const attrs = `${beforeAttrs ?? ""} ${afterAttrs ?? ""}`.toLowerCase();
      // Skip external URLs
      if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("//")) {
        return match;
      }
      const resolvedPath = resolvePath(currentPath, src);
      const jsContent = getFileContent(resolvedPath, allFileVersions);
      if (!jsContent) return match;

      const isModule = attrs.includes("type=\"module\"") || attrs.includes("type='module'");
      if (isModule) {
        const rewritten = moduleResolver.rewriteImports(jsContent, resolvedPath);
        return `<script type="module">/* Inlined from ${src} */\n${rewritten}</script>`;
      }
      return `<script>/* Inlined from ${src} */\n${jsContent}</script>`;
    }
  );

  return result;
}

// Build preview document with inlined local imports
function buildPreviewDocumentWithImports(
  ext: string,
  content: string,
  currentPath: string,
  allFileVersions: Record<string, AgentFileVersion[]>
): string {
  if (ext === "svg") {
    const svgCode = content.includes("<svg")
      ? content
      : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${content}</svg>`;
    return buildSvgDocument(svgCode, 1);
  }
  if (ext === "html") {
    const inlined = inlineLocalImports(content, currentPath, allFileVersions);
    return buildHtmlDocument(inlined);
  }
  if (["js", "mjs", "cjs"].includes(ext)) return buildJsDocument(content);
  if (["jsx", "tsx", "ts"].includes(ext)) return buildReactDocument(content);
  return buildTextDocument(content);
}

function FileTreeNode({
  entry,
  depth,
  parentPath,
  selectedPath,
  onSelect,
}: {
  entry: AgentFileEntry;
  depth: number;
  parentPath: string;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  const [open, setOpen] = useState(depth < 1);
  const isDir = entry.type === "dir";
  const Icon = isDir ? (open ? FolderOpen : Folder) : fileIcon(entry.name);
  const fullPath = buildFilePath(entry, parentPath);
  const isSelected = !isDir && selectedPath === fullPath;

  const handleClick = () => {
    if (isDir) {
      setOpen(!open);
    } else {
      onSelect(fullPath);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={`w-full flex items-center gap-1.5 py-1 transition-colors text-left ${
          isSelected
            ? "bg-violet-500/15 text-violet-300"
            : isDir
              ? "hover:bg-white/3 cursor-pointer"
              : "hover:bg-white/5 cursor-pointer"
        }`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
      >
        {isDir && (
          <span className="w-3 shrink-0 text-[#555]">
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </span>
        )}
        {!isDir && <span className="w-3 shrink-0" />}
        <Icon
          className={`h-3.5 w-3.5 shrink-0 ${
            isSelected ? "text-violet-400" : isDir ? "text-amber-500/70" : "text-blue-400/60"
          }`}
        />
        <span className={`text-[11px] truncate ${isSelected ? "text-violet-300" : "text-[#aaa]"}`}>
          {entry.name}
        </span>
        {entry.size != null && !isDir && (
          <span className="text-[9px] text-[#444] ml-auto pr-2 shrink-0">
            {entry.size < 1024
              ? `${entry.size}B`
              : entry.size < 1048576
                ? `${(entry.size / 1024).toFixed(1)}K`
                : `${(entry.size / 1048576).toFixed(1)}M`}
          </span>
        )}
      </button>
      {isDir && open && entry.children && (
        <div>
          {entry.children.map((child) => (
            <FileTreeNode
              key={child.name}
              entry={child}
              depth={depth + 1}
              parentPath={fullPath}
              selectedPath={selectedPath}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FileContentViewer({
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
  const { renderMarkdown } = useMessageParsing();
  const fileName = path.split("/").pop() || path;
  const ext = getFileExtension(fileName);
  const language = getLanguageFromExt(ext);
  const isImage = isImageFile(fileName) && ext !== "svg";
  const isMarkdown = ext === "md" || ext === "markdown";
  const previewable = isPreviewableExt(ext);
  const versionList = versions ?? [];
  const [activeTab, setActiveTab] = useState<"code" | "preview">(
    previewable ? "preview" : "code",
  );
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

  const markdownHtml = useMemo(() => {
    if (!isMarkdown) return "";
    return renderMarkdown(displayContent);
  }, [displayContent, isMarkdown, renderMarkdown]);

  return (
    <div className="flex flex-col h-full border-t border-white/6">
      {/* Header */}
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
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
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
                  activeTab === "preview"
                    ? "bg-white/8 text-foreground"
                    : "text-[#666] hover:text-[#888]"
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setActiveTab("code")}
                className={`px-2 py-1 rounded text-[10px] ${
                  activeTab === "code"
                    ? "bg-white/8 text-foreground"
                    : "text-[#666] hover:text-[#888]"
                }`}
              >
                Code
              </button>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto bg-[#0a0a0a]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 text-violet-400 animate-spin" />
          </div>
        ) : content === null && versionList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <File className="h-6 w-6 text-[#333] mb-2" />
            <p className="text-xs text-[#555]">
              {hasSession ? "Failed to load file" : "Start a chat to view files"}
            </p>
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
            <div
              className="chat-markdown text-[13px] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: markdownHtml }}
            />
          </div>
        ) : previewable && activeTab === "preview" ? (
          <div className="w-full h-full bg-[#0a0a0a]">
            <iframe
              srcDoc={buildPreviewDocumentWithImports(ext, displayContent, path, allFileVersions)}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms"
              title={`${fileName} preview`}
            />
          </div>
        ) : (
          <CodePreview
            code={displayContent}
            language={language}
            className="text-[11px] text-[#e6e2dd]"
          />
        )}
      </div>
    </div>
  );
}

export function AgentFilesPanel({
  files,
  fileVersions,
  plan,
  selectedFilePath,
  selectedFileContent,
  selectedFileLoading,
  onSelectFile,
  hasSession,
}: AgentFilesPanelProps) {
  const hasFiles = files.length > 0;
  const hasSelectedFile = selectedFilePath !== null;
  const flattenedFiles = useMemo(() => flattenFileEntries(files), [files]);
  const versionsForSelected =
    selectedFilePath && fileVersions[selectedFilePath] ? fileVersions[selectedFilePath] : [];
  const containerRef = useRef<HTMLDivElement>(null);
  const [fileListHeight, setFileListHeight] = useState(180);
  const [maxFileListHeight, setMaxFileListHeight] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const clampFileListHeight = useCallback(
    (nextHeight: number) => {
      const maxHeight = maxFileListHeight ?? nextHeight;
      const minHeight = 44;
      return Math.min(maxHeight, Math.max(minHeight, nextHeight));
    },
    [maxFileListHeight],
  );

  const updateMaxHeight = useCallback(() => {
    const containerHeight = containerRef.current?.getBoundingClientRect().height ?? 0;
    if (containerHeight <= 0) return;
    setMaxFileListHeight(Math.max(120, containerHeight - 220));
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const node = containerRef.current;
    const observer = new ResizeObserver(() => {
      updateMaxHeight();
    });
    observer.observe(node);
    const raf = window.requestAnimationFrame(updateMaxHeight);
    window.addEventListener("resize", updateMaxHeight);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateMaxHeight);
      observer.disconnect();
    };
  }, [updateMaxHeight]);

  const handleResizeStart = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsResizing(true);
      resizeRef.current = { startY: e.clientY, startHeight: fileListHeight };
    },
    [fileListHeight],
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const delta = e.clientY - resizeRef.current.startY;
      const nextHeight = clampFileListHeight(resizeRef.current.startHeight + delta);
      setFileListHeight(nextHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeRef.current = null;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [clampFileListHeight, isResizing]);

  const clampedFileListHeight = hasSelectedFile
    ? clampFileListHeight(fileListHeight)
    : fileListHeight;
  const isCompact = hasSelectedFile && clampedFileListHeight <= 56;

  return (
    <div className="flex flex-col h-full" ref={containerRef}>
      {/* Working directory */}
      <div className="px-3 py-2.5 border-b border-white/6 flex items-center gap-2 shrink-0">
        <Terminal className="h-3.5 w-3.5 text-violet-400" />
        <span className="text-[10px] text-[#666] font-mono truncate">~/agent-workspace</span>
      </div>

      {/* File tree - takes remaining space when no file selected, or fixed height when file selected */}
      <div
        className={`py-1 ${hasSelectedFile ? "shrink-0 border-b border-white/6" : "flex-1"} ${
          isCompact ? "overflow-x-auto" : "overflow-y-auto"
        }`}
        style={hasSelectedFile ? { height: `${clampedFileListHeight}px` } : undefined}
      >
        {hasFiles ? (
          isCompact ? (
            <div className="flex items-center gap-1.5 px-2">
              {flattenedFiles.map((file) => {
                const Icon = fileIcon(file.name);
                const isSelected = selectedFilePath === file.path;
                return (
                  <button
                    key={file.path}
                    onClick={() => onSelectFile(file.path)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono border transition-colors ${
                      isSelected
                        ? "bg-violet-500/20 text-violet-200 border-violet-500/40"
                        : "bg-white/4 text-[#aaa] border-white/8 hover:text-[#ddd] hover:bg-white/8"
                    }`}
                    title={file.path}
                  >
                    <Icon className="h-3 w-3" />
                    <span className="max-w-[140px] truncate">{file.name}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            files.map((entry) => (
              <FileTreeNode
                key={entry.name}
                entry={entry}
                depth={0}
                parentPath=""
                selectedPath={selectedFilePath}
                onSelect={onSelectFile}
              />
            ))
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <Folder className="h-8 w-8 text-[#2a2725] mb-3" />
            <p className="text-xs text-[#555] mb-1">No files yet</p>
            <p className="text-[10px] text-[#444] max-w-45 leading-relaxed">
              Files created by the agent during execution will appear here.
            </p>
          </div>
        )}
      </div>

      {hasSelectedFile && (
        <div
          className={`h-2 cursor-row-resize flex items-center justify-center bg-[#0b0b0b] border-b border-white/6 ${
            isResizing ? "bg-violet-500/10" : "hover:bg-white/4"
          }`}
          onMouseDown={handleResizeStart}
        >
          <div className="w-10 h-0.5 rounded-full bg-white/10" />
        </div>
      )}

      {/* File content viewer - only shown when a file is selected */}
      {hasSelectedFile && (
        <div className="flex-1 min-h-0">
          <FileContentViewer
            key={selectedFilePath}
            path={selectedFilePath}
            content={selectedFileContent}
            versions={versionsForSelected}
            allFileVersions={fileVersions}
            loading={selectedFileLoading}
            onClose={() => onSelectFile(null)}
            hasSession={hasSession}
          />
        </div>
      )}

      {/* Footer stats */}
      <div className="px-3 py-2 border-t border-white/6 flex items-center justify-between shrink-0">
        <span className="text-[10px] text-[#555]">
          {hasFiles ? `${countFiles(files)} files` : "Empty"}
        </span>
        {plan && (
          <span className="text-[10px] text-[#555]">
            {plan.steps.filter((s) => s.status === "done").length}/{plan.steps.length} steps
          </span>
        )}
      </div>

      {isResizing && (
        <style jsx global>{`
          body {
            cursor: row-resize !important;
            user-select: none !important;
          }
        `}</style>
      )}
    </div>
  );
}

function countFiles(entries: AgentFileEntry[]): number {
  let count = 0;
  for (const e of entries) {
    if (e.type === "file") count++;
    if (e.children) count += countFiles(e.children);
  }
  return count;
}

function flattenFileEntries(
  entries: AgentFileEntry[],
  parentPath: string = "",
): Array<{ path: string; name: string }> {
  const result: Array<{ path: string; name: string }> = [];
  for (const entry of entries) {
    const fullPath = buildFilePath(entry, parentPath);
    if (entry.type === "file") {
      result.push({ path: fullPath, name: entry.name });
    } else if (entry.children) {
      result.push(...flattenFileEntries(entry.children, fullPath));
    }
  }
  return result;
}
