// CRITICAL
"use client";

import { useCallback, useRef, type ChangeEvent } from "react";
import type { Attachment } from "../../../types";
import { fileToBase64, maybeRevokeObjectUrl } from "./utils";

type UpdateAttachments = (updater: (prev: Attachment[]) => Attachment[]) => void;

type Args = {
  updateAttachments: UpdateAttachments;
};

export function useAttachmentInputs({ updateAttachments }: Args) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const addAttachmentsFromInput = useCallback(
    async (e: ChangeEvent<HTMLInputElement>, type: "file" | "image") => {
      const files = Array.from(e.target.files || []);
      const newAttachments: Attachment[] = [];

      for (const file of files) {
        const attachment: Attachment = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          type: type === "image" ? "image" : "file",
          name: file.name,
          size: file.size,
          url: type === "image" ? URL.createObjectURL(file) : undefined,
          file,
        };

        if (type === "image") {
          try {
            attachment.base64 = await fileToBase64(file);
          } catch (err) {
            console.error("Failed to convert image to base64:", err);
          }
        }

        newAttachments.push(attachment);
      }

      updateAttachments((prev) => [...prev, ...newAttachments]);
      e.target.value = "";
    },
    [updateAttachments],
  );

  const handleFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      void addAttachmentsFromInput(e, "file");
    },
    [addAttachmentsFromInput],
  );

  const handleImageInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      void addAttachmentsFromInput(e, "image");
    },
    [addAttachmentsFromInput],
  );

  const removeAttachment = useCallback(
    (id: string) => {
      updateAttachments((prev) => {
        const attachment = prev.find((a) => a.id === id);
        maybeRevokeObjectUrl(attachment?.url);
        return prev.filter((a) => a.id !== id);
      });
    },
    [updateAttachments],
  );

  const handleAttachFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleAttachImage = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  return {
    fileInputRef,
    imageInputRef,
    handleFileInputChange,
    handleImageInputChange,
    removeAttachment,
    handleAttachFile,
    handleAttachImage,
  };
}

