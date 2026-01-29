"use client";

import { Square } from "lucide-react";

interface RecordingIndicatorProps {
  duration: number;
  onStop: () => void;
  formatDuration: (seconds: number) => string;
}

export function RecordingIndicator({
  duration,
  onStop,
  formatDuration,
}: RecordingIndicatorProps) {
  return (
    <div className="flex items-center gap-2.5 mb-3 mx-3 md:mx-0 px-3 py-2 border border-(--error)/20 rounded-lg transition-all:ease-in:200ms">
      <div className="w-2.5 h-2.5 rounded-full bg-(--error) animate-pulse" />
      <span className="font-sans font-medium text-sm text-(--error)">Recording</span>
      <span className="font-sans font-medium text-sm font-mono text-[#9a9590]">{formatDuration(duration)}</span>
      <button
        onClick={onStop}
        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 font-sans font-medium text-sm rounded-lg bg-(--error) text-white hover:opacity-90"
      >
        <Square className="h-2.5 w-2.5 fill-current" />
        Stop
      </button>
    </div>
  );
}
