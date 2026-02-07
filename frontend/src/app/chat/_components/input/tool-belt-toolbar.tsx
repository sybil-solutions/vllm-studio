// CRITICAL
"use client";

import { memo } from "react";
import {
  Paperclip,
  Image as ImageIcon,
  Mic,
  MicOff,
  Square,
  Globe,
  Code,
  Brain,
  Settings,
  SlidersHorizontal,
  Clock,
  Loader2,
  Wrench,
  ArrowUp,
  Volume2,
  VolumeX,
  Plus,
  PanelRightOpen,
  ListChecks,
} from "lucide-react";
import { ToolDropdown, DropdownItem } from "./tool-dropdown";
import type { ModelOption } from "../../types";

function SpinningLoaderIcon({ className }: { className?: string }) {
  return <Loader2 className={`${className ?? ""} animate-spin`} />;
}

interface ToolBeltToolbarProps {
  isLoading?: boolean;
  elapsedSeconds?: number;
  lastRunDurationSeconds?: number | null;
  thinkingSnippet?: string;
  isRecording: boolean;
  isTranscribing: boolean;
  attachmentsCount: number;
  disabled?: boolean;
  canSend: boolean;
  hasSystemPrompt?: boolean;
  mcpEnabled?: boolean;
  artifactsEnabled?: boolean;
  deepResearchEnabled?: boolean;
  isTTSEnabled?: boolean;
  planSummary?: string | null;
  onOpenResults?: () => void;
  planChipHidden?: boolean;
  onTogglePlanChipHidden?: () => void;
  availableModels?: ModelOption[];
  selectedModel?: string;
  onModelChange?: (modelId: string) => void;
  onOpenChatSettings?: () => void;
  onOpenMcpSettings?: () => void;
  onMcpToggle?: () => void;
  onArtifactsToggle?: () => void;
  onDeepResearchToggle?: () => void;
  onTTSToggle?: () => void;
  onAttachFile?: () => void;
  onAttachImage?: () => void;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  onStop?: () => void;
  onSubmit?: () => void;
}

export const ToolBeltToolbar = memo(function ToolBeltToolbar({
  isLoading,
  elapsedSeconds,
  lastRunDurationSeconds,
  thinkingSnippet,
  isRecording,
  isTranscribing,
  attachmentsCount,
  disabled,
  canSend,
  hasSystemPrompt,
  mcpEnabled,
  artifactsEnabled,
  deepResearchEnabled,
  isTTSEnabled,
  planSummary,
  onOpenResults,
  planChipHidden,
  onTogglePlanChipHidden,
  availableModels = [],
  selectedModel,
  onModelChange,
  onOpenChatSettings,
  onOpenMcpSettings,
  onMcpToggle,
  onArtifactsToggle,
  onDeepResearchToggle,
  onTTSToggle,
  onAttachFile,
  onAttachImage,
  onStartRecording,
  onStopRecording,
  onStop,
  onSubmit,
}: ToolBeltToolbarProps) {
  const hasActiveTools = Boolean(mcpEnabled || artifactsEnabled || deepResearchEnabled);
  const hasMobileMenuActive = Boolean(
    attachmentsCount > 0 ||
      hasActiveTools ||
      hasSystemPrompt ||
      isRecording ||
      isTranscribing ||
      isTTSEnabled
  );

  const showAttachmentSection = Boolean(onAttachFile || onAttachImage);
  const showVoiceSection = Boolean(onStartRecording || onStopRecording || onTTSToggle);
  const showToolsSection = Boolean(
    onMcpToggle || onArtifactsToggle || onDeepResearchToggle || onOpenMcpSettings
  );
  const showSettingsSection = Boolean(onOpenChatSettings);
  const voiceLabel = isTranscribing
    ? "Transcribing..."
    : isRecording
      ? "Stop recording"
      : "Voice input";
  const VoiceIcon = isTranscribing ? Loader2 : isRecording ? MicOff : Mic;
  const onVoiceClick = isRecording ? onStopRecording : onStartRecording;

  const VoiceIconComponent = isTranscribing ? SpinningLoaderIcon : VoiceIcon;
  const hasRunTime = typeof elapsedSeconds === "number" && elapsedSeconds >= 0;
  const hasLastRun = typeof lastRunDurationSeconds === "number" && lastRunDurationSeconds > 0;
  const showRunChip = Boolean((isLoading && hasRunTime) || (!isLoading && hasLastRun));
  const runChipLabelSeconds = isLoading ? (elapsedSeconds ?? 0) : (lastRunDurationSeconds ?? 0);
  const runChipLabel = `${Math.floor(runChipLabelSeconds / 60)}:${(runChipLabelSeconds % 60).toString().padStart(2, "0")}`;

  return (
    <div className="px-2 py-2">
      {/* Desktop */}
      <div className="hidden md:flex items-center justify-between">
        <div className="flex items-center gap-1 min-w-0">
          {isLoading && elapsedSeconds !== undefined && (
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg border border-blue-500/30 min-w-0">
              <Clock className="h-3 w-3 text-blue-400 animate-pulse shrink-0" />
              <span className="text-xs font-mono font-medium text-blue-400 shrink-0">
                {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, "0")}
              </span>
              <span className="text-[#3a3735]">·</span>
              <div className="flex items-center gap-1.5 min-w-0">
                <Wrench className="h-3 w-3 text-blue-400/70 shrink-0" />
                <span className="text-xs text-blue-200/80 truncate">
                  {thinkingSnippet?.trim() ? thinkingSnippet.trim() : "Working..."}
                </span>
              </div>
            </div>
          )}

          <ToolDropdown
            icon={Paperclip}
            label="Attach media"
            isActive={attachmentsCount > 0}
            disabled={disabled}
          >
            <DropdownItem icon={Paperclip} label="Attach file" onClick={onAttachFile} disabled={disabled} />
            <DropdownItem icon={ImageIcon} label="Attach image" onClick={onAttachImage} disabled={disabled} />
          </ToolDropdown>

          <button
            onClick={isRecording ? onStopRecording : onStartRecording}
            disabled={disabled || isTranscribing}
            className={`flex items-center justify-center p-2 rounded-lg transition-all:ease-in:200ms disabled:opacity-50 ${
              isRecording
                ? "bg-(--error) text-(--error)"
                : isTranscribing
                  ? "bg-(--link) text-(--link)"
                  : "hover:bg-(--accent) text-[#9a9590]"
            }`}
            title={isTranscribing ? "Transcribing..." : isRecording ? "Stop recording" : "Voice input"}
          >
            {isTranscribing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isRecording ? (
              <MicOff className="h-3.5 w-3.5" />
            ) : (
              <Mic className="h-3.5 w-3.5" />
            )}
          </button>

          {onTTSToggle && (
            <button
              onClick={onTTSToggle}
              disabled={disabled}
              className={`flex items-center justify-center p-2 rounded-lg transition-all:ease-in:200ms disabled:opacity-50 ${
                isTTSEnabled ? "bg-(--success) text-(--success)" : "hover:bg-(--accent) text-[#9a9590]"
              }`}
              title={isTTSEnabled ? "Disable TTS" : "Enable TTS"}
            >
              {isTTSEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </button>
          )}

          <ToolDropdown icon={Wrench} label="Tools" isActive={hasActiveTools} disabled={disabled}>
            <DropdownItem icon={Globe} label="Web search & tools" isActive={mcpEnabled} onClick={onMcpToggle} disabled={disabled} />
            {onArtifactsToggle && (
              <DropdownItem icon={Code} label="Code preview" isActive={artifactsEnabled} onClick={onArtifactsToggle} disabled={disabled} />
            )}
            {onDeepResearchToggle && (
              <DropdownItem icon={Brain} label="Deep Research" isActive={deepResearchEnabled} onClick={onDeepResearchToggle} disabled={disabled} />
            )}
            {onOpenMcpSettings && (
              <>
                <div className="h-px bg-(--border) my-1" />
                <DropdownItem icon={Settings} label="MCP servers" onClick={onOpenMcpSettings} disabled={disabled} />
              </>
            )}
          </ToolDropdown>

          {onOpenChatSettings && (
            <button
              onClick={onOpenChatSettings}
              disabled={disabled}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg transition-all:ease-in:200ms disabled:opacity-50 ${
                hasSystemPrompt
                  ? "bg-(--card-hover) text-[#e8e4dd] border border-(--border)"
                  : "hover:bg-(--accent) text-[#9a9590]"
              }`}
              title={hasSystemPrompt ? "System prompt (active)" : "System prompt"}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {availableModels.length > 0 && onModelChange && (
            <select
              value={selectedModel || ""}
              onChange={(e) => onModelChange(e.target.value)}
              disabled={disabled || isLoading}
              className="max-w-[180px] px-2 py-1 font-sans font-medium text-xs bg-transparent border border-(--border) rounded-lg text-[#9a9590] focus:outline-none disabled:opacity-50 truncate appearance-none cursor-pointer hover:border-[#4a4745] transition-colors:ease-in:200ms"
              title={selectedModel || "Select model"}
            >
              {availableModels.map((model, idx) => (
                <option key={`${model.id}-${idx}`} value={model.id}>
                  {model.id}
                </option>
              ))}
            </select>
          )}

          {isLoading ? (
            <button
              onClick={onStop}
              className="h-8 w-8 flex items-center justify-center rounded-full bg-(--error) text-white transition-colors:ease-in:200ms shrink-0"
              title="Stop"
            >
              <Square className="h-3 w-3 fill-current" />
            </button>
          ) : (
            <button
              onClick={onSubmit}
              disabled={!canSend}
              className={`h-8 w-8 flex items-center justify-center rounded-full transition-colors:ease-in:200ms shrink-0 ${
                canSend ? "bg-[#e8e4dd] text-[#1a1918]" : "bg-(--accent) text-[#9a9590]/50 cursor-not-allowed"
              }`}
              title="Send"
            >
              <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      {/* Mobile: single-row controls, equal-sized buttons */}
      <div className="md:hidden flex items-center gap-2">
        <ToolDropdown
          icon={Plus}
          label="More actions"
          isActive={hasMobileMenuActive}
          disabled={disabled}
          showChevron={false}
          buttonVariant="circle"
        >
          {showRunChip && (
            <>
              <DropdownItem icon={Clock} label={`Runtime: ${runChipLabel}`} disabled />
              <div className="h-px bg-(--border) my-1" />
            </>
          )}

          {onTogglePlanChipHidden && (
            <>
              <DropdownItem
                icon={ListChecks}
                label={planChipHidden ? "Show plan chip" : "Hide plan chip"}
                isActive={!planChipHidden}
                onClick={onTogglePlanChipHidden}
                disabled={disabled}
                closeOnClick
              />
              <div className="h-px bg-(--border) my-1" />
            </>
          )}

          {onOpenResults && (
            <>
              <DropdownItem icon={PanelRightOpen} label="Results" onClick={onOpenResults} disabled={disabled} closeOnClick />
              {planSummary && (
                <DropdownItem icon={ListChecks} label={planSummary} onClick={onOpenResults} disabled={disabled} closeOnClick />
              )}
              <div className="h-px bg-(--border) my-1" />
            </>
          )}

          {showAttachmentSection && (
            <>
              {onAttachFile && (
                <DropdownItem icon={Paperclip} label="Attach file" onClick={onAttachFile} disabled={disabled} closeOnClick />
              )}
              {onAttachImage && (
                <DropdownItem icon={ImageIcon} label="Attach image" onClick={onAttachImage} disabled={disabled} closeOnClick />
              )}
              {(showVoiceSection || showToolsSection || showSettingsSection) && (
                <div className="h-px bg-(--border) my-1" />
              )}
            </>
          )}

          {showVoiceSection && (
            <>
              {(onStartRecording || onStopRecording) && (
                <DropdownItem
                  icon={VoiceIconComponent}
                  label={voiceLabel}
                  isActive={isRecording || isTranscribing}
                  onClick={onVoiceClick}
                  disabled={disabled || isTranscribing}
                  closeOnClick
                />
              )}
              {onTTSToggle && (
                <DropdownItem
                  icon={isTTSEnabled ? Volume2 : VolumeX}
                  label={isTTSEnabled ? "Disable TTS" : "Enable TTS"}
                  isActive={isTTSEnabled}
                  onClick={onTTSToggle}
                  disabled={disabled}
                  closeOnClick
                />
              )}
              {(showToolsSection || showSettingsSection) && <div className="h-px bg-(--border) my-1" />}
            </>
          )}

          {showToolsSection && (
            <>
              {onMcpToggle && (
                <DropdownItem icon={Globe} label="Web search & tools" isActive={mcpEnabled} onClick={onMcpToggle} disabled={disabled} closeOnClick />
              )}
              {onArtifactsToggle && (
                <DropdownItem icon={Code} label="Code preview" isActive={artifactsEnabled} onClick={onArtifactsToggle} disabled={disabled} closeOnClick />
              )}
              {onDeepResearchToggle && (
                <DropdownItem icon={Brain} label="Deep Research" isActive={deepResearchEnabled} onClick={onDeepResearchToggle} disabled={disabled} closeOnClick />
              )}
              {onOpenMcpSettings && (
                <>
                  <div className="h-px bg-(--border) my-1" />
                  <DropdownItem icon={Settings} label="MCP servers" onClick={onOpenMcpSettings} disabled={disabled} closeOnClick />
                </>
              )}
              {showSettingsSection && <div className="h-px bg-(--border) my-1" />}
            </>
          )}

          {showSettingsSection && onOpenChatSettings && (
            <DropdownItem
              icon={SlidersHorizontal}
              label={hasSystemPrompt ? "System prompt (active)" : "System prompt"}
              isActive={hasSystemPrompt}
              onClick={onOpenChatSettings}
              disabled={disabled}
              closeOnClick
            />
          )}
        </ToolDropdown>

        {onOpenResults && (
          <button
            onClick={onOpenResults}
            disabled={disabled}
            className="h-10 w-10 flex items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#cfcac2] hover:bg-white/8 transition-colors disabled:opacity-50"
            title="Open results"
          >
            <PanelRightOpen className="h-4 w-4" />
          </button>
        )}

        {availableModels.length > 0 && onModelChange && (
          <div className="flex-1 min-w-0">
            <select
              value={selectedModel || ""}
              onChange={(e) => onModelChange(e.target.value)}
              disabled={disabled || isLoading}
              className="h-10 w-full px-3 font-mono text-[12px] bg-white/5 border border-white/10 rounded-full text-[#d9d4cb] focus:outline-none disabled:opacity-50 truncate appearance-none cursor-pointer hover:bg-white/7 transition-colors"
              title={selectedModel || "Select model"}
            >
              {availableModels.map((model, idx) => (
                <option key={`${model.id}-${idx}`} value={model.id}>
                  {model.id}
                </option>
              ))}
            </select>
          </div>
        )}

        {isLoading ? (
          <button
            onClick={onStop}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-(--error) text-white transition-colors:ease-in:200ms shrink-0"
            title="Stop"
          >
            <Square className="h-4 w-4 fill-current" />
          </button>
        ) : (
          <button
            onClick={onSubmit}
            disabled={!canSend}
            className={`h-10 w-10 flex items-center justify-center rounded-full transition-colors:ease-in:200ms shrink-0 ${
              canSend
                ? "bg-[#e8e4dd] text-[#1a1918]"
                : "bg-white/5 border border-white/10 text-[#cfcac2]/40 cursor-not-allowed"
            }`}
            title="Send"
          >
            <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
});
