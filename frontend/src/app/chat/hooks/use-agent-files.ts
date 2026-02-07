// CRITICAL
"use client";

import { useCallback } from "react";
import api from "@/lib/api";
import type { AgentFileEntry } from "@/lib/types";
import { useAppStore } from "@/store";
import { isLocalImportSpecifier, resolvePath } from "../utils/path-resolver";
import { useShallow } from "zustand/react/shallow";

const getExtension = (path: string): string => {
  const parts = path.split(".");
  return parts.length > 1 ? parts[parts.length - 1]?.toLowerCase() ?? "" : "";
};

const isLocalSpecifier = isLocalImportSpecifier;

const extractHtmlDependencies = (html: string, basePath: string): string[] => {
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
};

const extractJsImports = (code: string, basePath: string): string[] => {
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
};

const resolveScriptPath = (path: string): string[] => {
  const attempts = [path];
  if (!/\.[a-z0-9]+$/i.test(path)) {
    attempts.push(`${path}.js`);
    attempts.push(`${path}.mjs`);
    attempts.push(`${path}.jsx`);
    attempts.push(`${path}/index.js`);
  }
  return attempts;
};

export function useAgentFiles() {
  const {
    currentSessionId,
    agentFiles,
    agentFilesLoading,
    setAgentFiles,
    setAgentFilesLoading,
    selectedAgentFilePath,
    selectedAgentFileContent,
    selectedAgentFileLoading,
    setSelectedAgentFilePath,
    setSelectedAgentFileContent,
    setSelectedAgentFileLoading,
    agentFileVersions,
    addAgentFileVersion,
    hydrateAgentFileVersions,
    moveAgentFileVersions,
    clearAgentFileVersions,
  } = useAppStore(
    useShallow((state) => ({
      currentSessionId: state.currentSessionId,
      agentFiles: state.agentFiles,
      agentFilesLoading: state.agentFilesLoading,
      setAgentFiles: state.setAgentFiles,
      setAgentFilesLoading: state.setAgentFilesLoading,
      selectedAgentFilePath: state.selectedAgentFilePath,
      selectedAgentFileContent: state.selectedAgentFileContent,
      selectedAgentFileLoading: state.selectedAgentFileLoading,
      setSelectedAgentFilePath: state.setSelectedAgentFilePath,
      setSelectedAgentFileContent: state.setSelectedAgentFileContent,
      setSelectedAgentFileLoading: state.setSelectedAgentFileLoading,
      agentFileVersions: state.agentFileVersions,
      addAgentFileVersion: state.addAgentFileVersion,
      hydrateAgentFileVersions: state.hydrateAgentFileVersions,
      moveAgentFileVersions: state.moveAgentFileVersions,
      clearAgentFileVersions: state.clearAgentFileVersions,
    })),
  );

  const prefetchDependencies = useCallback(
    async (entryPath: string, content: string, sessionId: string) => {
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
    },
    [addAgentFileVersion],
  );

  // Read session ID at execution time to avoid stale closure issues.
  // When tools are called during streaming, the closure value may be stale
  // even though the store has been updated.
  const resolveSessionId = (sessionIdOverride?: string | null) => {
    // Read fresh from store to handle cases where session was just created
    const freshSessionId = useAppStore.getState().currentSessionId;
    return sessionIdOverride || freshSessionId || currentSessionId;
  };

  const loadAgentFiles = useCallback(
    async (options?: {
      sessionId?: string | null;
      path?: string;
      recursive?: boolean;
    }): Promise<AgentFileEntry[]> => {
      const sessionId = resolveSessionId(options?.sessionId);
      if (!sessionId) {
        setAgentFiles([]);
        setAgentFilesLoading(false);
        return [];
      }
      setAgentFilesLoading(true);
      try {
        const data = await api.getAgentFiles(sessionId, {
          path: options?.path,
          recursive: options?.recursive,
        });
        const files = Array.isArray(data.files) ? data.files : [];
        setAgentFiles(files);
        return files;
      } catch (err) {
        // Log error for debugging
        console.error("[loadAgentFiles] Error:", err);
        setAgentFiles([]);
        return [];
      } finally {
        setAgentFilesLoading(false);
      }
    },
    [currentSessionId, setAgentFiles, setAgentFilesLoading],
  );

  const readAgentFile = useCallback(
    async (path: string, sessionIdOverride?: string | null) => {
      const sessionId = resolveSessionId(sessionIdOverride);
      if (!sessionId) {
        throw new Error("No active session");
      }
      if (!path || path.trim() === "") {
        throw new Error("Path is required");
      }
      const data = await api.readAgentFile(sessionId, path);
      if (typeof data.content === "string") {
        addAgentFileVersion(path, data.content);
      }
      return data;
    },
    [currentSessionId, addAgentFileVersion],
  );

  const writeAgentFile = useCallback(
    async (path: string, content: string, sessionIdOverride?: string | null) => {
      const sessionId = resolveSessionId(sessionIdOverride);
      if (!sessionId) {
        throw new Error("No active session");
      }
      const result = await api.writeAgentFile(sessionId, path, { content });
      if (typeof content === "string") {
        addAgentFileVersion(path, content);
      }
      const files = await loadAgentFiles({ sessionId });
      return result;
    },
    [currentSessionId, loadAgentFiles, addAgentFileVersion],
  );

  const deleteAgentFile = useCallback(
    async (path: string, sessionIdOverride?: string | null) => {
      const sessionId = resolveSessionId(sessionIdOverride);
      if (!sessionId) {
        throw new Error("No active session");
      }
      const result = await api.deleteAgentFile(sessionId, path);
      await loadAgentFiles({ sessionId });
      return result;
    },
    [currentSessionId, loadAgentFiles],
  );

  const createAgentDirectory = useCallback(
    async (path: string, sessionIdOverride?: string | null) => {
      const sessionId = resolveSessionId(sessionIdOverride);
      if (!sessionId) {
        throw new Error("No active session");
      }
      const result = await api.createAgentDirectory(sessionId, path);
      await loadAgentFiles({ sessionId });
      return result;
    },
    [currentSessionId, loadAgentFiles],
  );

  const moveAgentFile = useCallback(
    async (from: string, to: string, sessionIdOverride?: string | null) => {
      const sessionId = resolveSessionId(sessionIdOverride);
      if (!sessionId) {
        throw new Error("No active session");
      }
      const result = await api.moveAgentFile(sessionId, from, to);
      moveAgentFileVersions(from, to);
      await loadAgentFiles({ sessionId });
      return result;
    },
    [currentSessionId, loadAgentFiles, moveAgentFileVersions],
  );

  const clearAgentFiles = useCallback(() => {
    setAgentFiles([]);
    setAgentFilesLoading(false);
    setSelectedAgentFilePath(null);
    setSelectedAgentFileContent(null);
    clearAgentFileVersions();
  }, [
    setAgentFiles,
    setAgentFilesLoading,
    setSelectedAgentFilePath,
    setSelectedAgentFileContent,
    clearAgentFileVersions,
  ]);

  const selectAgentFile = useCallback(
    async (path: string | null, sessionIdOverride?: string | null) => {
      // Deselect if null
      if (!path) {
        setSelectedAgentFilePath(null);
        setSelectedAgentFileContent(null);
        return;
      }

      const sessionId = resolveSessionId(sessionIdOverride);
      if (!sessionId) {
        // No session - just show the file is selected but can't load content
        console.warn("[selectAgentFile] No active session, cannot load file content");
        setSelectedAgentFilePath(path);
        setSelectedAgentFileContent(null);
        setSelectedAgentFileLoading(false);
        return;
      }

      // Set path immediately for UI feedback
      setSelectedAgentFilePath(path);
      setSelectedAgentFileLoading(true);

      try {
        const data = await api.readAgentFileWithVersions(sessionId, path);
        setSelectedAgentFileContent(data.content);
        if (typeof data.content === "string") {
          if (Array.isArray(data.versions) && data.versions.length > 0) {
            hydrateAgentFileVersions(path, data.versions);
          } else {
            addAgentFileVersion(path, data.content);
          }
          const ext = getExtension(path);
          if (ext === "html" || ext === "htm") {
            void prefetchDependencies(path, data.content, sessionId);
          }
        }
      } catch (err) {
        console.error("[selectAgentFile] Error reading file:", err);
        setSelectedAgentFileContent(null);
      } finally {
        setSelectedAgentFileLoading(false);
      }
    },
    [
      currentSessionId,
      setSelectedAgentFilePath,
      setSelectedAgentFileContent,
      setSelectedAgentFileLoading,
      addAgentFileVersion,
      hydrateAgentFileVersions,
      prefetchDependencies,
    ],
  );

  const clearSelectedFile = useCallback(() => {
    setSelectedAgentFilePath(null);
    setSelectedAgentFileContent(null);
  }, [setSelectedAgentFilePath, setSelectedAgentFileContent]);

  return {
    agentFiles,
    agentFilesLoading,
    agentFileVersions,
    loadAgentFiles,
    readAgentFile,
    writeAgentFile,
    deleteAgentFile,
    createAgentDirectory,
    moveAgentFile,
    clearAgentFiles,
    // File selection
    selectedAgentFilePath,
    selectedAgentFileContent,
    selectedAgentFileLoading,
    selectAgentFile,
    clearSelectedFile,
    addAgentFileVersion,
    moveAgentFileVersions,
  };
}
