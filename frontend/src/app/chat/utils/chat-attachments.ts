// CRITICAL
"use client";

import type { Attachment } from "../types";

export type UploadedAttachment = {
  name: string;
  path: string;
  size: number;
  type: Attachment["type"];
  encoding: "utf8" | "base64";
};

const TEXT_MIME_TYPES = new Set([
  "application/json",
  "application/xml",
  "application/yaml",
  "application/x-yaml",
  "application/csv",
  "application/markdown",
]);

const TEXT_EXTENSIONS = [".txt", ".md", ".markdown", ".json", ".csv", ".yaml", ".yml", ".log"];

export const sanitizeAttachmentName = (value: string): string => {
  const cleaned = value.replace(/[\\/]/g, "_").replace(/[^\w.\-]+/g, "_");
  const normalized = cleaned.replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  return normalized || "attachment";
};

const isTextAttachment = (attachment: Attachment): boolean => {
  const file = attachment.file;
  if (!file) return false;
  const type = file.type.toLowerCase();
  if (type.startsWith("text/")) return true;
  if (TEXT_MIME_TYPES.has(type)) return true;
  const name = attachment.name.toLowerCase();
  return TEXT_EXTENSIONS.some((ext) => name.endsWith(ext));
};

const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const base64 = result.includes(",") ? (result.split(",")[1] ?? "") : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
};

export const readAttachmentContent = async (
  attachment: Attachment,
): Promise<{ content: string; encoding: "utf8" | "base64" }> => {
  if (attachment.type === "image" || attachment.type === "audio") {
    if (attachment.base64) {
      return { content: attachment.base64, encoding: "base64" };
    }
    if (!attachment.file) {
      throw new Error("Attachment file missing");
    }
    const base64 = await readFileAsBase64(attachment.file);
    return { content: base64, encoding: "base64" };
  }

  if (!attachment.file) {
    throw new Error("Attachment file missing");
  }

  if (isTextAttachment(attachment)) {
    const content = await attachment.file.text();
    return { content, encoding: "utf8" };
  }

  const base64 = await readFileAsBase64(attachment.file);
  return { content: base64, encoding: "base64" };
};

export const buildAttachmentsBlock = (attachments: UploadedAttachment[]): string => {
  if (attachments.length === 0) return "";
  const lines: string[] = [];

  lines.push("<attachments>");
  lines.push("The user uploaded files into the agent filesystem for this run.");
  lines.push("Use read_file/list_files to access them.");
  for (const attachment of attachments) {
    lines.push(`- name: ${attachment.name}`);
    lines.push(`  path: ${attachment.path}`);
    lines.push(`  type: ${attachment.type}`);
    lines.push(`  size: ${attachment.size} bytes`);
    if (attachment.encoding === "base64") {
      lines.push("  encoding: base64 (decode before interpreting)");
    }
  }
  lines.push("</attachments>");
  return lines.join("\n");
};
