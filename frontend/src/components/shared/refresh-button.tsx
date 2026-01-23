"use client";

import { RefreshCw } from "lucide-react";

interface RefreshButtonProps {
  onRefresh: () => void;
  loading?: boolean;
  className?: string;
}

function RefreshButton({ onRefresh, loading = false, className = "" }: RefreshButtonProps) {
  return (
    <button
      onClick={onRefresh}
      disabled={loading}
      className={`p-2 hover:bg-(--card-hover) rounded-lg transition-colors ${className}`}
    >
      <RefreshCw className={`h-4 w-4 text-(--muted-foreground) ${loading ? "animate-spin" : ""}`} />
    </button>
  );
}

export { RefreshButton };
