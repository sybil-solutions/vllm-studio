// CRITICAL
import type { StateCreator } from "zustand";
import type { ChatSlice } from "../chat-slice-types";
import { DEFAULT_ARTIFACT_VIEWER_ENTRY, DEFAULT_CODE_BLOCK_ENTRY } from "../chat-slice-defaults";

type Set = Parameters<StateCreator<ChatSlice, [], [], ChatSlice>>[0];
type ArtifactViewerEntry = typeof DEFAULT_ARTIFACT_VIEWER_ENTRY;
type CodeBlockEntry = typeof DEFAULT_CODE_BLOCK_ENTRY;

function areArtifactViewerEntriesEqual(
  a: typeof DEFAULT_ARTIFACT_VIEWER_ENTRY,
  b: typeof DEFAULT_ARTIFACT_VIEWER_ENTRY,
) {
  if (a === b) return true;
  return (
    a.isFullscreen === b.isFullscreen &&
    a.showCode === b.showCode &&
    a.copied === b.copied &&
    a.scale === b.scale &&
    a.position.x === b.position.x &&
    a.position.y === b.position.y &&
    a.isDragging === b.isDragging &&
    a.isRunning === b.isRunning &&
    (a.error ?? null) === (b.error ?? null)
  );
}

function areCodeBlockEntriesEqual(a: typeof DEFAULT_CODE_BLOCK_ENTRY, b: typeof DEFAULT_CODE_BLOCK_ENTRY) {
  if (a === b) return true;
  return a.copied === b.copied && a.isExpanded === b.isExpanded;
}

export function createArtifactActions(set: Set) {
  return {
    updateArtifactViewerState: (
      artifactId: string,
      updater: (prev: ArtifactViewerEntry) => ArtifactViewerEntry,
    ) =>
      set((state) => {
        const prev = state.artifactViewerState[artifactId] ?? DEFAULT_ARTIFACT_VIEWER_ENTRY;
        const next = updater(prev);
        if (next === prev) return state;
        if (areArtifactViewerEntriesEqual(prev, next as typeof DEFAULT_ARTIFACT_VIEWER_ENTRY)) return state;
        return {
          artifactViewerState: {
            ...state.artifactViewerState,
            [artifactId]: next,
          },
        };
      }),
    updateCodeBlockState: (blockId: string, updater: (prev: CodeBlockEntry) => CodeBlockEntry) =>
      set((state) => {
        const prev = state.codeBlockState[blockId] ?? DEFAULT_CODE_BLOCK_ENTRY;
        const next = updater(prev);
        if (next === prev) return state;
        if (areCodeBlockEntriesEqual(prev, next as typeof DEFAULT_CODE_BLOCK_ENTRY)) return state;
        return {
          codeBlockState: {
            ...state.codeBlockState,
            [blockId]: next,
          },
        };
      }),
    deleteCodeBlockState: (blockId: string) =>
      set((state) => {
        if (!(blockId in state.codeBlockState)) return state;
        const next = { ...state.codeBlockState };
        delete next[blockId];
        return { codeBlockState: next };
      }),
    setMermaidState: (id: string, svg: string, error: string | null) =>
      set((state) => {
        const prev = state.mermaidState[id];
        if (prev && prev.svg === svg && prev.error === error) return state;
        return {
          mermaidState: {
            ...state.mermaidState,
            [id]: { svg, error },
          },
        };
      }),
    deleteMermaidState: (id: string) =>
      set((state) => {
        if (!(id in state.mermaidState)) return state;
        const next = { ...state.mermaidState };
        delete next[id];
        return { mermaidState: next };
      }),
  } as const;
}
