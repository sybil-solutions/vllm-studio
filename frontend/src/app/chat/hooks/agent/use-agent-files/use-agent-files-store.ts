"use client";

import { useShallow } from "zustand/react/shallow";
import { useAppStore } from "@/store";

export function useAgentFilesStore() {
  return useAppStore(
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
}

