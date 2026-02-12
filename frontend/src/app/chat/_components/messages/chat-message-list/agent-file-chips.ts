// CRITICAL
"use client";

import * as Icons from "../../icons";
import type { AgentFileEntry } from "@/lib/types";

export type AgentFileChip = { path: string; name: string };

function getFileExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export function fileIcon(name: string) {
  const ext = getFileExtension(name);
  if (["ts", "tsx", "js", "jsx", "py", "rs", "go", "rb", "java", "c", "cpp", "h", "css", "scss", "html"].includes(ext))
    return Icons.FileCode;
  if (["json", "yaml", "yml", "toml", "xml"].includes(ext)) return Icons.FileJson;
  if (["md", "txt", "csv", "log", "env"].includes(ext)) return Icons.FileText;
  if (["png", "jpg", "jpeg", "gif", "svg", "webp", "ico"].includes(ext)) return Icons.File;
  return Icons.File;
}

export function flattenAgentFiles(entries: AgentFileEntry[], parentPath: string = ""): AgentFileChip[] {
  const result: AgentFileChip[] = [];
  for (const entry of entries) {
    const fullPath = parentPath ? `${parentPath}/${entry.name}` : entry.name;
    if (entry.type === "file") {
      result.push({ path: fullPath, name: entry.name });
    } else if (entry.children) {
      result.push(...flattenAgentFiles(entry.children, fullPath));
    }
  }
  return result;
}

