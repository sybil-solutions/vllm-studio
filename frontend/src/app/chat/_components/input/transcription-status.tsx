"use client";

import { memo } from "react";
import { Loader2, X } from "lucide-react";

interface TranscriptionStatusProps {
  isTranscribing: boolean;
  error: string | null;
  onDismissError: () => void;
}

export const TranscriptionStatus = memo(function TranscriptionStatus({
  isTranscribing,
  error,
  onDismissError,
}: TranscriptionStatusProps) {
  return (
    <>
      {isTranscribing && (
        <div className="flex items-center gap-2.5 mb-3 mx-3 md:mx-0 px-3 py-2 border border-(--hl1)/20 rounded-lg transition-all:ease-in:200ms">
          <Loader2 className="h-3.5 w-3.5 text-(--hl1) animate-spin" />
          <span className="font-sans font-medium text-sm text-(--hl1)">Transcribing audio...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2.5 mb-3 mx-3 md:mx-0 px-3 py-2 border border-(--err)/20 rounded-lg transition-all:ease-in:200ms">
          <span className="font-sans font-medium text-sm text-(--err)">{error}</span>
          <button
            onClick={onDismissError}
            className="ml-auto p-1 hover:bg-(--err)/20 rounded"
          >
            <X className="h-3 w-3 text-(--err)" />
          </button>
        </div>
      )}
    </>
  );
});
