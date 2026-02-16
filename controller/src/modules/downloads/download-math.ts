// CRITICAL
import type { DownloadFileInfo } from "./types";

/**
 * Sum downloaded bytes for all files.
 * @param files - File list.
 * @returns Total downloaded bytes.
 */
export const sumDownloadedBytes = (files: DownloadFileInfo[]): number => {
  return files.reduce((total, file) => total + (file.downloaded_bytes || 0), 0);
};

/**
 * Sum total bytes for all files with a known size.
 * @param files - File list.
 * @returns Total bytes if any file sizes are known, otherwise null.
 */
export const sumTotalBytes = (files: DownloadFileInfo[]): number | null => {
  const known = files.filter((file) => typeof file.size_bytes === "number") as Array<
    DownloadFileInfo & { size_bytes: number }
  >;
  if (known.length === 0) {
    return null;
  }
  return known.reduce((total, file) => total + file.size_bytes, 0);
};
