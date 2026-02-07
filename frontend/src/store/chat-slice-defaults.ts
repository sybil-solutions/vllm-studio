// CRITICAL
import type { DeepResearchConfig } from "@/lib/types";

export const DEFAULT_DEEP_RESEARCH: DeepResearchConfig = {
  enabled: false,
  maxSources: 10,
  searchDepth: "medium",
  autoSummarize: true,
  includeCitations: true,
};

export const DEFAULT_ARTIFACT_VIEWER_ENTRY = {
  isFullscreen: false,
  showCode: false,
  copied: false,
  scale: 1,
  position: { x: 0, y: 0 },
  isDragging: false,
  isRunning: true,
  error: null as string | null,
};

export const DEFAULT_CODE_BLOCK_ENTRY = {
  copied: false,
  isExpanded: false,
};

