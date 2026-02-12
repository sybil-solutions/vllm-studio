// CRITICAL
import type { ModelDownload } from "@/lib/types";

export const setupSteps = ["Welcome", "Hardware", "Model", "Download"];

export const formatBytes = (bytes: number | null): string => {
  if (!bytes || bytes <= 0) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
};

export const progressPercent = (download: ModelDownload | null): number => {
  if (!download?.total_bytes) return 0;
  return Math.min(100, Math.round((download.downloaded_bytes / download.total_bytes) * 100));
};

