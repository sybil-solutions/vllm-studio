"use client";

import * as Icons from "../../icons";

export function UserMessage({
  messageId,
  textContent,
  copied,
  canActOnContent,
  onCopy,
  onExport,
  actionButtonClassName,
}: {
  messageId: string;
  textContent: string;
  copied: boolean;
  canActOnContent: boolean;
  onCopy: () => void;
  onExport: () => void;
  actionButtonClassName: string;
}) {
  return (
    <div id={`message-${messageId}`} className="group">
      <div className="md:hidden flex justify-end">
        <div className="max-w-[85%] rounded-2xl border border-white/10 bg-white/10 px-3 py-2">
          <div className="text-[15px] leading-relaxed text-(--fg) whitespace-pre-wrap break-words">
            {textContent}
          </div>
        </div>
      </div>

      <div className="hidden md:flex justify-end">
        <div className="ml-auto max-w-[62%] rounded-xl border border-(--border) bg-(--surface)/70 px-3 py-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-[10px] uppercase tracking-[0.2em] text-(--dim)">You</div>
            <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={onCopy} disabled={!canActOnContent} className={actionButtonClassName} title="Copy">
                {copied ? (
                  <Icons.Check className="h-3.5 w-3.5 text-(--hl2)" />
                ) : (
                  <Icons.Copy className="h-3.5 w-3.5 text-(--dim)" />
                )}
              </button>
              <button onClick={onExport} disabled={!canActOnContent} className={actionButtonClassName} title="Export">
                <Icons.Download className="h-3.5 w-3.5 text-(--dim)" />
              </button>
            </div>
          </div>
          <div className="text-[15px] leading-relaxed text-(--fg) whitespace-pre-wrap break-words">
            {textContent}
          </div>
        </div>
      </div>
    </div>
  );
}

