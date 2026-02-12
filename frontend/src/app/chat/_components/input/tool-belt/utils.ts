import type { Attachment } from "../../../types";

export function maybeRevokeObjectUrl(url: string | undefined) {
  if (!url) return;
  if (!url.startsWith("blob:")) return;
  URL.revokeObjectURL(url);
}

export function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
}

export function clearAttachmentUrls(attachments: Attachment[]) {
  for (const attachment of attachments) {
    maybeRevokeObjectUrl(attachment.url);
  }
}

