// CRITICAL
"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, File, FileCode, FileJson, FileText, Folder, FolderOpen, Image as ImageIcon } from "lucide-react";
import type { AgentFileEntry } from "@/lib/types";
import { getFileExtension } from "./agent-file-metadata";

export function getAgentFileIcon(name: string) {
  const ext = getFileExtension(name);
  if (
    ["ts", "tsx", "js", "jsx", "py", "rs", "go", "rb", "java", "c", "cpp", "h", "css", "scss", "html"].includes(ext)
  )
    return FileCode;
  if (["json", "yaml", "yml", "toml", "xml"].includes(ext)) return FileJson;
  if (["md", "txt", "csv", "log", "env"].includes(ext)) return FileText;
  if (["png", "jpg", "jpeg", "gif", "svg", "webp", "ico"].includes(ext)) return ImageIcon;
  return File;
}

export function buildAgentFilePath(entry: AgentFileEntry, parentPath: string): string {
  return parentPath ? `${parentPath}/${entry.name}` : entry.name;
}

interface AgentFileTreeNodeProps {
  entry: AgentFileEntry;
  depth: number;
  fullPath: string;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

export const AgentFileTreeNode = memo(function AgentFileTreeNode({
  entry,
  depth,
  fullPath,
  selectedPath,
  onSelect,
}: AgentFileTreeNodeProps) {
  const [open, setOpen] = useState(depth < 1);
  const isDir = entry.type === "dir";
  const isSelected = !isDir && selectedPath === fullPath;
  const Icon = useMemo(() => {
    return isDir ? (open ? FolderOpen : Folder) : getAgentFileIcon(entry.name);
  }, [entry.name, isDir, open]);

  const handleClick = useCallback(() => {
    if (isDir) {
      setOpen((prev) => !prev);
    } else {
      onSelect(fullPath);
    }
  }, [fullPath, isDir, onSelect]);

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
          <span className="w-3 shrink-0 text-(--dim)">
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </span>
        )}
        {!isDir && <span className="w-3 shrink-0" />}
        <Icon
          className={`h-3.5 w-3.5 shrink-0 ${
            isSelected ? "text-violet-400" : isDir ? "text-amber-500/70" : "text-blue-400/60"
          }`}
        />
        <span className={`text-[11px] truncate ${isSelected ? "text-violet-300" : "text-(--dim)"}`}>{entry.name}</span>
        {entry.size != null && !isDir && (
          <span className="text-[9px] text-(--dim) ml-auto pr-2 shrink-0">
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
          {entry.children.map((child) => {
            const childPath = buildAgentFilePath(child, fullPath);
            return (
              <AgentFileTreeNode
                key={childPath}
                entry={child}
                depth={depth + 1}
                fullPath={childPath}
                selectedPath={selectedPath}
                onSelect={onSelect}
              />
            );
          })}
        </div>
      )}
    </div>
  );
},
function areAgentFileTreeNodePropsEqual(prev, next) {
  if (prev.depth !== next.depth) return false;
  if (prev.fullPath !== next.fullPath) return false;
  if (prev.onSelect !== next.onSelect) return false;

  // Update when the entry changes (new tree, size update, etc).
  const a = prev.entry;
  const b = next.entry;
  if (a !== b) {
    if (a.name !== b.name) return false;
    if (a.type !== b.type) return false;
    if ((a.size ?? null) !== (b.size ?? null)) return false;
    if ((a.children?.length ?? 0) !== (b.children?.length ?? 0)) return false;
  }

  // Avoid re-rendering every node on selection changes: only re-render file nodes
  // whose selected/unselected status actually flips.
  if (prev.entry.type !== "file") return true;
  const prevSelected = prev.selectedPath === prev.fullPath;
  const nextSelected = next.selectedPath === next.fullPath;
  return prevSelected === nextSelected;
});

export function countAgentFiles(entries: AgentFileEntry[]): number {
  let count = 0;
  for (const entry of entries) {
    if (entry.type === "file") count++;
    if (entry.children) count += countAgentFiles(entry.children);
  }
  return count;
}

export function flattenAgentFileEntries(
  entries: AgentFileEntry[],
  parentPath: string = "",
): Array<{ path: string; name: string }> {
  const result: Array<{ path: string; name: string }> = [];
  for (const entry of entries) {
    const fullPath = buildAgentFilePath(entry, parentPath);
    if (entry.type === "file") {
      result.push({ path: fullPath, name: entry.name });
    } else if (entry.children) {
      result.push(...flattenAgentFileEntries(entry.children, fullPath));
    }
  }
  return result;
}
