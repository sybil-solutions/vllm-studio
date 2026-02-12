// CRITICAL
"use client";

import {
  ChevronRight,
  Download,
  Menu,
  RefreshCw,
} from "lucide-react";
import type { LogSession } from "@/lib/types";
import { LogsSessionsSidebar } from "./logs-view/logs-sessions-sidebar";

interface LogsViewProps {
  sessions: LogSession[];
  filteredSessions: LogSession[];
  selectedSession: string | null;
  hasLogContent: boolean;
  filter: string;
  contentFilter: string;
  loading: boolean;
  loadingContent: boolean;
  autoScroll: boolean;
  autoRefresh: boolean;
  sidebarOpen: boolean;
  logRef: React.RefObject<HTMLDivElement | null>;
  onFilterChange: (value: string) => void;
  onContentFilterChange: (value: string) => void;
  onAutoScrollChange: (value: boolean) => void;
  onAutoRefreshChange: (value: boolean) => void;
  onSidebarToggle: (value: boolean) => void;
  onLoadLogContent: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onDownloadLog: () => void;
  onRenderLogs: () => React.ReactNode;
  onSelectSession: (sessionId: string) => void;
  formatDateTime: (dateValue: string) => string;
}

export function LogsView({
  sessions,
  filteredSessions,
  selectedSession,
  hasLogContent,
  filter,
  contentFilter,
  loading,
  loadingContent,
  autoScroll,
  autoRefresh,
  sidebarOpen,
  logRef,
  onFilterChange,
  onContentFilterChange,
  onAutoScrollChange,
  onAutoRefreshChange,
  onSidebarToggle,
  onLoadLogContent,
  onDeleteSession,
  onDownloadLog,
  onRenderLogs,
  onSelectSession,
  formatDateTime,
}: LogsViewProps) {
  if (loading)
    return (
      <div className="flex items-center justify-center h-full bg-[#1b1b1b]">
        <div className="flex items-center gap-2 text-[#9a9088]">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading logs...</span>
        </div>
      </div>
    );

  return (
    <div className="flex h-full bg-[#1b1b1b] text-[#f0ebe3] relative">
      <LogsSessionsSidebar
        sessions={sessions}
        filteredSessions={filteredSessions}
        selectedSession={selectedSession}
        filter={filter}
        sidebarOpen={sidebarOpen}
        onFilterChange={onFilterChange}
        onSidebarToggle={onSidebarToggle}
        onSelectSession={onSelectSession}
        onDeleteSession={onDeleteSession}
        formatDateTime={formatDateTime}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedSession ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b border-[#363432] gap-2">
              <div className="flex items-center gap-2 text-sm min-w-0 flex-1">
                <button
                  onClick={() => onSidebarToggle(true)}
                  className="md:hidden p-1 hover:bg-[#2a2826] rounded flex-shrink-0"
                >
                  <Menu className="h-4 w-4 text-[#9a9088]" />
                </button>
                <ChevronRight className="h-3.5 w-3.5 text-[#9a9088] hidden sm:block flex-shrink-0" />
                <span className="text-[#f0ebe3] font-mono truncate text-xs sm:text-sm">
                  {selectedSession}
                </span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                <label className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#9a9088] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(event) => onAutoRefreshChange(event.target.checked)}
                    className="rounded border-[#363432] bg-[#1e1e1e] text-[#7d9a6a] focus:ring-0 focus:ring-offset-0"
                  />
                  Auto-refresh
                </label>
                <label className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#9a9088] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(event) => onAutoScrollChange(event.target.checked)}
                    className="rounded border-[#363432] bg-[#1e1e1e] text-[#7d9a6a] focus:ring-0 focus:ring-offset-0"
                  />
                  Auto-scroll
                </label>
                <div className="w-px h-4 bg-[#363432] hidden sm:block" />
                <input
                  type="text"
                  value={contentFilter}
                  onChange={(event) => onContentFilterChange(event.target.value)}
                  placeholder="Filter..."
                  className="px-2.5 py-1.5 text-xs bg-[#1e1e1e] border border-[#363432] rounded text-[#f0ebe3] placeholder-[#9a9088]/50 focus:outline-none focus:border-[#8b7355] w-24 sm:w-40"
                />
                <button
                  onClick={() => selectedSession && onLoadLogContent(selectedSession)}
                  className="p-1.5 hover:bg-[#2a2826] rounded transition-colors"
                  title="Refresh"
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 text-[#9a9088] ${loadingContent ? "animate-spin" : ""}`}
                  />
                </button>
                <button
                  onClick={onDownloadLog}
                  className="p-1.5 hover:bg-[#2a2826] rounded transition-colors"
                  title="Download"
                >
                  <Download className="h-3.5 w-3.5 text-[#9a9088]" />
                </button>
              </div>
            </div>

            {/* Log Content */}
            <div
              ref={logRef}
              className="flex-1 overflow-auto p-2 sm:p-4 font-mono text-[10px] sm:text-xs bg-[#1b1b1b] leading-relaxed"
            >
              {loadingContent ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex items-center gap-2 text-[#9a9088]">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Loading...</span>
                  </div>
                </div>
              ) : hasLogContent ? (
                onRenderLogs()
              ) : (
                <div className="text-center text-[#9a9088]">No log content</div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <button
              onClick={() => onSidebarToggle(true)}
              className="md:hidden flex items-center gap-2 px-4 py-2 bg-[#363432] rounded-lg text-[#f0ebe3] text-sm"
            >
              <Menu className="h-4 w-4" />
              View Sessions
            </button>
            <div className="text-center text-[#9a9088]">
              <p className="text-sm">Select a log session to view</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
