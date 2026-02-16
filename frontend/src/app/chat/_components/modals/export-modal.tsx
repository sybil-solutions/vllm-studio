// CRITICAL
"use client";

import { X, Download, FileJson, FileText } from "lucide-react";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportJson: () => void;
  onExportMarkdown: () => void;
}

export function ExportModal({
  isOpen,
  onClose,
  onExportJson,
  onExportMarkdown,
}: ExportModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        className="absolute inset-0 z-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close"
      />
      <div className="relative z-10 w-full max-w-sm mx-4 bg-(--surface) border border-(--border) rounded-xl shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border)">
          <div className="flex items-center gap-2">
            <Download className="h-5 w-5 text-(--dim)" />
            <h2 className="text-lg font-semibold">Export Chat</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-(--accent)"
          >
            <X className="h-5 w-5 text-(--dim)" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-3">
          <button
            onClick={() => {
              onExportJson();
              onClose();
            }}
            className="w-full flex items-center gap-3 p-4 bg-(--bg) border border-(--border) rounded-lg hover:bg-(--accent) transition-colors"
          >
            <FileJson className="h-5 w-5 text-(--hl1)" />
            <div className="text-left">
              <div className="font-medium">Export as JSON</div>
              <div className="text-xs text-(--dim)">
                Full conversation data with metadata
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              onExportMarkdown();
              onClose();
            }}
            className="w-full flex items-center gap-3 p-4 bg-(--bg) border border-(--border) rounded-lg hover:bg-(--accent) transition-colors"
          >
            <FileText className="h-5 w-5 text-(--hl2)" />
            <div className="text-left">
              <div className="font-medium">Export as Markdown</div>
              <div className="text-xs text-(--dim)">
                Human-readable format
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
