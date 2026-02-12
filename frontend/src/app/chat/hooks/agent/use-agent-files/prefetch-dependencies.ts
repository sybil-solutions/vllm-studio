// CRITICAL
"use client";

import api from "@/lib/api";
import { isLocalImportSpecifier, resolvePath } from "../../../utils/path-resolver";

export function getExtension(path: string): string {
  const parts = path.split(".");
  return parts.length > 1 ? parts[parts.length - 1]?.toLowerCase() ?? "" : "";
}

const isLocalSpecifier = isLocalImportSpecifier;

function extractHtmlDependencies(html: string, basePath: string): string[] {
  const dependencies: string[] = [];
  const linkRegex = /<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*\/?>/gi;
  const scriptRegex = /<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    if (!isLocalSpecifier(href)) continue;
    dependencies.push(resolvePath(basePath, href));
  }
  while ((match = scriptRegex.exec(html)) !== null) {
    const src = match[1];
    if (!isLocalSpecifier(src)) continue;
    dependencies.push(resolvePath(basePath, src));
  }
  return dependencies;
}

function extractJsImports(code: string, basePath: string): string[] {
  const dependencies: string[] = [];
  const patterns = [
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /import\s+[^'"]*?\s+from\s+['"]([^'"]+)['"]/g,
    /export\s+[^'"]*?\s+from\s+['"]([^'"]+)['"]/g,
    /import\s+['"]([^'"]+)['"]/g,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(code)) !== null) {
      const spec = match[1];
      if (!isLocalSpecifier(spec)) continue;
      dependencies.push(resolvePath(basePath, spec));
    }
  }
  return dependencies;
}

function resolveScriptPath(path: string): string[] {
  const attempts = [path];
  if (!/\.[a-z0-9]+$/i.test(path)) {
    attempts.push(`${path}.js`);
    attempts.push(`${path}.mjs`);
    attempts.push(`${path}.jsx`);
    attempts.push(`${path}/index.js`);
  }
  return attempts;
}

export async function prefetchDependencies({
  entryPath,
  content,
  sessionId,
  addAgentFileVersion,
}: {
  entryPath: string;
  content: string;
  sessionId: string;
  addAgentFileVersion: (path: string, content: string) => void;
}) {
  const queue: string[] = [];
  const seen = new Set<string>();

  const enqueue = (paths: string[]) => {
    for (const p of paths) {
      if (!p || seen.has(p)) continue;
      queue.push(p);
    }
  };

  enqueue(extractHtmlDependencies(content, entryPath));

  while (queue.length > 0) {
    const nextPath = queue.shift();
    if (!nextPath || seen.has(nextPath)) continue;
    seen.add(nextPath);

    const attempts = resolveScriptPath(nextPath);
    let loadedContent: string | null = null;
    let resolvedPath: string | null = null;

    for (const attempt of attempts) {
      try {
        const data = await api.readAgentFile(sessionId, attempt);
        if (typeof data.content === "string") {
          loadedContent = data.content;
          resolvedPath = attempt;
          addAgentFileVersion(attempt, data.content);
          break;
        }
      } catch {
        // ignore and try next attempt
      }
    }

    if (!loadedContent || !resolvedPath) continue;

    const ext = getExtension(resolvedPath);
    if (ext === "html" || ext === "htm") {
      enqueue(extractHtmlDependencies(loadedContent, resolvedPath));
    }
    if (["js", "mjs", "jsx"].includes(ext)) {
      enqueue(extractJsImports(loadedContent, resolvedPath));
    }
  }
}
