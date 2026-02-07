// CRITICAL
"use client";

import { memo, useCallback, useEffect, useRef, type ChangeEvent, type KeyboardEvent } from "react";
import type { ComponentProps, ReactNode } from "react";
import { AttachmentsPreview } from "./attachments-preview";
import { RecordingIndicator } from "./recording-indicator";
import { TranscriptionStatus } from "./transcription-status";
import { ToolBeltToolbar } from "./tool-belt-toolbar";
import type { Attachment, ModelOption } from "../../types";
import { useAppStore } from "@/store";
import { useShallow } from "zustand/react/shallow";

function maybeRevokeObjectUrl(url: string | undefined) {
  if (!url) return;
  if (!url.startsWith("blob:")) return;
  URL.revokeObjectURL(url);
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileToBase64(file: File): Promise<string> {
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

interface ToolBeltProps {
  onSubmit: (value: string, attachments?: Attachment[]) => void;
  disabled?: boolean;
  isLoading?: boolean;
  thinkingSnippet?: string;
  placeholder?: string;
  onStop?: () => void;
  onOpenResults?: () => void;
  planSummary?: string | null;
  planChipHidden?: boolean;
  onTogglePlanChipHidden?: () => void;
  selectedModel?: string;
  availableModels?: ModelOption[];
  onModelChange?: (modelId: string) => void;
  mcpEnabled?: boolean;
  onMcpToggle?: () => void;
  artifactsEnabled?: boolean;
  onArtifactsToggle?: () => void;
  onOpenMcpSettings?: () => void;
  onOpenChatSettings?: () => void;
  hasSystemPrompt?: boolean;
  deepResearchEnabled?: boolean;
  onDeepResearchToggle?: () => void;
  planDrawer?: ReactNode;
}

const ToolBeltToolbarContainer = memo(function ToolBeltToolbarContainer(
  props: Omit<ComponentProps<typeof ToolBeltToolbar>, "elapsedSeconds" | "lastRunDurationSeconds">,
) {
  const elapsedSeconds = useAppStore((state) => state.elapsedSeconds);
  const lastRunDurationSeconds = useAppStore((state) => state.lastRunDurationSeconds);
  return (
    <ToolBeltToolbar
      {...props}
      elapsedSeconds={elapsedSeconds}
      lastRunDurationSeconds={lastRunDurationSeconds}
    />
  );
});

export function ToolBelt({
  onSubmit,
  isLoading,
  thinkingSnippet,
  placeholder = "Message...",
  onStop,
  onOpenResults,
  planSummary,
  planChipHidden,
  onTogglePlanChipHidden,
  selectedModel,
  availableModels = [],
  onModelChange,
  mcpEnabled = false,
  onMcpToggle,
  artifactsEnabled = false,
  onArtifactsToggle,
  onOpenMcpSettings,
  onOpenChatSettings,
  hasSystemPrompt = false,
  deepResearchEnabled = false,
  onDeepResearchToggle,
  planDrawer,
}: ToolBeltProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const isDisabled = false;
  const {
    value,
    setInput,
    queuedContext,
    setQueuedContext,
    attachments,
    setAttachments,
    updateAttachments,
    isRecording,
    setIsRecording,
    isTranscribing,
    setIsTranscribing,
    transcriptionError,
    setTranscriptionError,
    recordingDuration,
    setRecordingDuration,
    isTTSEnabled,
    setIsTTSEnabled,
  } = useAppStore(
    useShallow((state) => ({
      value: state.input,
      setInput: state.setInput,
      queuedContext: state.queuedContext,
      setQueuedContext: state.setQueuedContext,
      attachments: state.attachments,
      setAttachments: state.setAttachments,
      updateAttachments: state.updateAttachments,
      isRecording: state.isRecording,
      setIsRecording: state.setIsRecording,
      isTranscribing: state.isTranscribing,
      setIsTranscribing: state.setIsTranscribing,
      transcriptionError: state.transcriptionError,
      setTranscriptionError: state.setTranscriptionError,
      recordingDuration: state.recordingDuration,
      setRecordingDuration: state.setRecordingDuration,
      isTTSEnabled: state.isTTSEnabled,
      setIsTTSEnabled: state.setIsTTSEnabled,
    })),
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const baseHeightRef = useRef<number>(44);
  const lastShouldCapRef = useRef<boolean | null>(null);

  // Keep the transcript from disappearing under the fixed mobile composer by exposing its height as a CSS var.
  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const update = () => {
      const height = Math.ceil(node.getBoundingClientRect().height);
      if (height > 0) {
        document.documentElement.style.setProperty("--chat-composer-height", `${height}px`);
      }
    };
    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(node);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollHeight = textareaRef.current.scrollHeight;
      const shouldCap = window.innerWidth >= 768;

      // `getComputedStyle` can be surprisingly expensive; only re-read when the breakpoint flips.
      if (lastShouldCapRef.current !== shouldCap) {
        lastShouldCapRef.current = shouldCap;
        const minHeight = Number.parseFloat(window.getComputedStyle(textareaRef.current).minHeight);
        baseHeightRef.current =
          Number.isFinite(minHeight) && minHeight > 0 ? minHeight : shouldCap ? 44 : 52;
      }

      const baseHeight = baseHeightRef.current;
      const newHeight = shouldCap
        ? Math.min(Math.max(scrollHeight, baseHeight), 200)
        : Math.max(scrollHeight, baseHeight);
      textareaRef.current.style.height = newHeight + "px";
      textareaRef.current.style.overflowY =
        shouldCap && scrollHeight > 200 ? "auto" : "hidden";
    }
  }, [value, isLoading, queuedContext]);

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

  const transcribeAudio = useCallback(async (audioBlob: Blob): Promise<string | null> => {
    try {
      setIsTranscribing(true);
      setTranscriptionError(null);

      const formData = new FormData();
      formData.append("file", audioBlob, "recording.webm");
      formData.append("model", "whisper-1");

      const response = await fetch("/api/voice/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.details || errorData.error || `Transcription failed (${response.status})`,
        );
      }

      const data = await response.json();
      if (!data.text) {
        throw new Error("No transcription returned");
      }
      return data.text;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Transcription failed";
      console.error("Transcription error:", err);
      setTranscriptionError(errorMessage);
      setTimeout(() => setTranscriptionError(null), 5000);
      return null;
    } finally {
      setIsTranscribing(false);
    }
  }, [setIsTranscribing, setTranscriptionError]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());

        const transcript = await transcribeAudio(audioBlob);
        if (transcript) {
          const currentInput = useAppStore.getState().input;
          setInput(currentInput ? `${currentInput} ${transcript}` : transcript);
          textareaRef.current?.focus();
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);

      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(useAppStore.getState().recordingDuration + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  }, [setInput, setIsRecording, setRecordingDuration, transcribeAudio]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  }, [isRecording, setIsRecording]);

  const handleTTSToggle = useCallback(() => {
    const current = useAppStore.getState().isTTSEnabled;
    setIsTTSEnabled(!current);
  }, [setIsTTSEnabled]);

  const handleAttachFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleAttachImage = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const handleDismissTranscriptionError = useCallback(() => {
    setTranscriptionError(null);
  }, [setTranscriptionError]);

  const handleTextChange = useCallback(
    (nextValue: string) => {
      if (isLoading) setQueuedContext(nextValue);
      else setInput(nextValue);
    },
    [isLoading, setInput, setQueuedContext],
  );

  const handleSubmit = useCallback(() => {
    if (isLoading) return;
    const state = useAppStore.getState();
    const inputValue = state.input;
    const currentAttachments = state.attachments;
    if (!inputValue.trim() && currentAttachments.length === 0) return;

    onSubmit(inputValue, currentAttachments.length > 0 ? [...currentAttachments] : undefined);

    for (const attachment of currentAttachments) {
      maybeRevokeObjectUrl(attachment.url);
    }
    setAttachments([]);
  }, [isLoading, onSubmit, setAttachments]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const canSend = value.trim() || attachments.length > 0;

  return (
    <div ref={rootRef} className="px-2 md:px-3 pb-0">
      <div className="w-full max-w-none md:max-w-4xl md:mx-auto px-0 md:px-0">
        <AttachmentsPreview
          attachments={attachments}
          onRemove={removeAttachment}
          formatFileSize={formatFileSize}
        />

        {isRecording && (
          <RecordingIndicator
            duration={recordingDuration}
            onStop={stopRecording}
            formatDuration={formatDuration}
          />
        )}

        <TranscriptionStatus
          isTranscribing={isTranscribing}
          error={transcriptionError}
          onDismissError={handleDismissTranscriptionError}
        />

        <div
          className={`relative flex flex-col bg-[#1a1a1a] rounded-3xl border border-white/[0.08] ${
            isLoading ? "ring-1 ring-blue-500/30" : ""
          }`}
          style={{
            boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 8px 40px rgba(0,0,0,0.35)",
          }}
        >
          <div className="hidden md:block">{planDrawer}</div>
          {planSummary && onOpenResults && (
            <button
              onClick={onOpenResults}
              className="md:hidden absolute -top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full border border-white/10 bg-[#121212]/90 backdrop-blur text-[11px] text-[#d8d3ca] shadow-sm hover:bg-[#151515]/95 transition-colors"
              title="Open plan"
            >
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-violet-300" />
              <span className="truncate max-w-[70vw]">{planSummary}</span>
            </button>
          )}
          <textarea
            ref={textareaRef}
            value={isLoading ? queuedContext : value}
            onChange={(e) => handleTextChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isDisabled
                ? "No model running"
                : isLoading
                  ? "Type here to queue for next message..."
                  : placeholder
            }
            disabled={isDisabled}
            rows={1}
            className="w-full px-3 py-2.5 md:px-4 md:py-3 bg-transparent text-[15px] md:text-sm resize-none focus:outline-none disabled:opacity-50 placeholder:text-[#9a9590] overflow-y-hidden min-h-[44px] md:min-h-[44px]"
            style={{ fontSize: "16px", lineHeight: "1.5" }}
          />

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileInputChange}
            className="hidden"
            multiple
            accept=".txt,.pdf,.doc,.docx,.md,.json,.csv"
          />
          <input
            ref={imageInputRef}
            type="file"
            onChange={handleImageInputChange}
            className="hidden"
            multiple
            accept="image/*"
          />

        <ToolBeltToolbarContainer
          isLoading={isLoading}
          thinkingSnippet={thinkingSnippet}
          isRecording={isRecording}
          isTranscribing={isTranscribing}
          attachmentsCount={attachments.length}
          disabled={isDisabled}
          canSend={canSend as boolean}
          hasSystemPrompt={hasSystemPrompt}
          mcpEnabled={mcpEnabled}
          artifactsEnabled={artifactsEnabled}
          deepResearchEnabled={deepResearchEnabled}
          isTTSEnabled={isTTSEnabled}
          planSummary={planSummary}
          onOpenResults={onOpenResults}
          planChipHidden={planChipHidden}
          onTogglePlanChipHidden={onTogglePlanChipHidden}
          availableModels={availableModels}
          selectedModel={selectedModel}
          onModelChange={onModelChange}
          onOpenChatSettings={onOpenChatSettings}
          onOpenMcpSettings={onOpenMcpSettings}
            onMcpToggle={onMcpToggle}
            onArtifactsToggle={onArtifactsToggle}
            onDeepResearchToggle={onDeepResearchToggle}
            onTTSToggle={handleTTSToggle}
            onAttachFile={handleAttachFile}
            onAttachImage={handleAttachImage}
            onStartRecording={startRecording}
            onStopRecording={stopRecording}
            onStop={onStop}
            onSubmit={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}
