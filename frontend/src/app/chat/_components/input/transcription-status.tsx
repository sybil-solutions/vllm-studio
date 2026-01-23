"use client";

import { Loader2, X } from "lucide-react";

interface TranscriptionStatusProps {
  isTranscribing: boolean;
  error: string | null;
  onDismissError: () => void;
}

export function TranscriptionStatus({
  isTranscribing,
  error,
  onDismissError,
}: TranscriptionStatusProps) {
  return (
    <>
      {isTranscribing && (
        <div className="flex items-center gap-2.5 mb-3 mx-3 md:mx-0 px-3 py-2 bg-(--link)/10 border border-(--link)/20 rounded-lg">
          <Loader2 className="h-4 w-4 text-(--link) animate-spin" />
          <span className="text-sm text-(--link)">Transcribing audio...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2.5 mb-3 mx-3 md:mx-0 px-3 py-2 bg-(--error)/10 border border-(--error)/20 rounded-lg">
          <span className="text-sm text-(--error)">{error}</span>
          <button
            onClick={onDismissError}
            className="ml-auto p-1 hover:bg-(--error)/20 rounded"
          >
            <X className="h-3.5 w-3.5 text-(--error)" />
          </button>
        </div>
      )}
    </>
  );
}
