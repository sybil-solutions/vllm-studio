// CRITICAL
"use client";

import { memo, useCallback, useMemo } from "react";
import { X, ChevronDown, ChevronUp, TriangleAlert, Info, CheckCircle2 } from "lucide-react";
import { useAppStore } from "@/store";

function formatTime(ts: number) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function kindMeta(kind: "error" | "warning" | "info" | "success") {
  switch (kind) {
    case "error":
      return { icon: TriangleAlert, ring: "border-red-500/25", tint: "bg-red-500/8 text-red-200" };
    case "warning":
      return { icon: TriangleAlert, ring: "border-amber-500/25", tint: "bg-amber-500/8 text-amber-200" };
    case "success":
      return { icon: CheckCircle2, ring: "border-emerald-500/25", tint: "bg-emerald-500/8 text-emerald-200" };
    default:
      return { icon: Info, ring: "border-sky-500/25", tint: "bg-sky-500/8 text-sky-200" };
  }
}

export const ToastStack = memo(function ToastStack() {
  const toasts = useAppStore((s) => s.toasts);
  const closeToast = useAppStore((s) => s.closeToast);
  const toggleExpanded = useAppStore((s) => s.toggleToastExpanded);

  const containerStyle = useMemo(
    () => ({ marginBottom: "env(safe-area-inset-bottom)" }),
    [],
  );

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 z-[60] flex flex-col gap-2 sm:max-w-[420px]"
      style={containerStyle}
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((t) => (
        <ToastItem
          key={t.id}
          id={t.id}
          kind={t.kind}
          title={t.title}
          message={t.message}
          detail={t.detail}
          createdAt={t.createdAt}
          expanded={t.expanded}
          onClose={closeToast}
          onToggleExpanded={toggleExpanded}
        />
      ))}
    </div>
  );
});

function ToastItem({
  id,
  kind,
  title,
  message,
  detail,
  createdAt,
  expanded,
  onClose,
  onToggleExpanded,
}: {
  id: string;
  kind: "error" | "warning" | "info" | "success";
  title: string;
  message?: string;
  detail?: string;
  createdAt: number;
  expanded: boolean;
  onClose: (id: string) => void;
  onToggleExpanded: (id: string) => void;
}) {
  const meta = kindMeta(kind);
  const Icon = meta.icon;

  const handleClose = useCallback(() => onClose(id), [id, onClose]);
  const handleToggle = useCallback(() => onToggleExpanded(id), [id, onToggleExpanded]);
  const time = useMemo(() => formatTime(createdAt), [createdAt]);

  return (
    <div
      className={`relative rounded-xl border ${meta.ring} bg-(--bg)/92 backdrop-blur px-3 py-2 shadow-[0_12px_40px_rgba(0,0,0,0.55)]`}
    >
      <div className="flex items-start gap-2">
        <div className={`mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center ${meta.tint}`}>
          <Icon className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-xs font-medium text-(--fg) truncate">{title}</div>
            {time && <div className="text-[10px] text-(--dim) font-mono shrink-0">{time}</div>}
          </div>
          {message && <div className="mt-0.5 text-xs text-(--dim) leading-snug">{message}</div>}

          {detail && expanded && (
            <pre className="mt-2 max-h-44 overflow-auto rounded-lg border border-(--border) bg-(--bg) p-2 text-[10px] leading-relaxed text-(--dim) font-mono whitespace-pre-wrap">
              {detail}
            </pre>
          )}

          {detail && (
            <button
              onClick={handleToggle}
              className="mt-2 inline-flex items-center gap-1 text-[11px] text-(--dim) hover:text-(--fg) transition-colors"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {expanded ? "Hide details" : "Show details"}
            </button>
          )}
        </div>

        <button
          onClick={handleClose}
          className="p-1.5 rounded-lg hover:bg-(--border) text-(--dim) hover:text-(--fg) transition-colors"
          title="Close"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
