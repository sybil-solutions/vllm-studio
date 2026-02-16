/**
 * Model download status.
 */
export type DownloadStatus =
  | "queued"
  | "downloading"
  | "paused"
  | "completed"
  | "failed"
  | "canceled";

/**
 * Download file status.
 */
export type DownloadFileStatus = "pending" | "downloading" | "completed" | "error";

/**
 * Download file payload.
 */
export interface DownloadFileInfo {
  path: string;
  size_bytes: number | null;
  downloaded_bytes: number;
  status: DownloadFileStatus;
}

/**
 * Model download entry.
 */
export interface ModelDownload {
  id: string;
  model_id: string;
  revision: string | null;
  status: DownloadStatus;
  created_at: string;
  updated_at: string;
  target_dir: string;
  total_bytes: number | null;
  downloaded_bytes: number;
  files: DownloadFileInfo[];
  error: string | null;
}
