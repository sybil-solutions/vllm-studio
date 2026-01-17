'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { X, Loader2, Check, ChevronDown, ChevronRight } from 'lucide-react';
import { ArtifactPanel } from '@/components/chat';
import type { ToolCall, ToolResult, Artifact } from '@/lib/types';
import type { ResearchProgress, ResearchSource } from '@/components/chat/research-progress';

interface ExtendedToolCall extends ToolCall {
  messageId: string;
  model?: string;
}

interface ThinkingActivityItem {
  type: 'thinking';
  id: string;
  content: string;
  isComplete: boolean;
  isStreaming: boolean;
}

interface ToolActivityItem {
  type: 'tool';
  id: string;
  toolCall: ExtendedToolCall;
}

type ActivityItem = ThinkingActivityItem | ToolActivityItem;

interface ChatSidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  activePanel: 'tools' | 'artifacts';
  onSetActivePanel: (panel: 'tools' | 'artifacts') => void;
  allToolCalls: ExtendedToolCall[];
  toolResultsMap: Map<string, ToolResult>;
  executingTools: Set<string>;
  sessionArtifacts: Artifact[];
  researchProgress: ResearchProgress | null;
  researchSources: ResearchSource[];
  thinkingContent: string | null;
  thinkingActive: boolean;
  activityItems: ActivityItem[];
}

export function ChatSidePanel({
  isOpen,
  onClose,
  activePanel,
  onSetActivePanel,
  allToolCalls,
  toolResultsMap,
  executingTools,
  sessionArtifacts,
  researchProgress,
  researchSources,
  thinkingContent,
  thinkingActive,
  activityItems,
}: ChatSidePanelProps) {
  if (!isOpen) return null;

  return (
    <div className="w-[22rem] flex-shrink-0 border-l border-[var(--border)] bg-[var(--background)] flex flex-col overflow-hidden">
      {/* Header with elegant tabs */}
      <div className="border-b border-[var(--border)] bg-[var(--background)]">
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => onSetActivePanel('tools')}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                activePanel === 'tools'
                  ? 'text-[#e8e4dd]'
                  : 'text-[#9a9590] hover:text-[#b0a8a0]'
              }`}
            >
              <span>Tools</span>
              {(executingTools.size > 0 || thinkingActive) && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-[var(--success)] opacity-75" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                </span>
              )}
              {allToolCalls.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5">
                  {allToolCalls.length}
                </span>
              )}
            </button>
            <button
              onClick={() => onSetActivePanel('artifacts')}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                activePanel === 'artifacts'
                  ? 'text-[#e8e4dd]'
                  : 'text-[#9a9590] hover:text-[#b0a8a0]'
              }`}
            >
              <span>Artifacts</span>
              {sessionArtifacts.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5">
                  {sessionArtifacts.length}
                </span>
              )}
            </button>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:opacity-80 transition-opacity"
          >
            <X className="h-3.5 w-3.5 text-[#9a9590] hover:text-[#b0a8a0]" />
          </button>
        </div>
      </div>

      {/* Panel content */}
      <div className="flex-1 min-h-0 overflow-y-auto text-sm">
        {activePanel === 'tools' && (
          <ToolsPanel
            allToolCalls={allToolCalls}
            toolResultsMap={toolResultsMap}
            executingTools={executingTools}
            researchProgress={researchProgress}
            researchSources={researchSources}
            thinkingContent={thinkingContent}
            thinkingActive={thinkingActive}
            activityItems={activityItems}
          />
        )}
        {activePanel === 'artifacts' && (
          <ArtifactPanel artifacts={sessionArtifacts} isOpen={true} />
        )}
      </div>
    </div>
  );
}

// Tools Panel Component
interface ToolsPanelProps {
  allToolCalls: ExtendedToolCall[];
  toolResultsMap: Map<string, ToolResult>;
  executingTools: Set<string>;
  researchProgress: ResearchProgress | null;
  researchSources: ResearchSource[];
  thinkingContent: string | null;
  thinkingActive: boolean;
  activityItems: ActivityItem[];
}

function ToolsPanel({
  allToolCalls,
  toolResultsMap,
  executingTools,
  researchProgress,
  researchSources,
  thinkingContent,
  thinkingActive,
  activityItems,
}: ToolsPanelProps) {
  const toolCount = allToolCalls.length;
  const listRef = useRef<HTMLDivElement | null>(null);
  const prevCountRef = useRef(0);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(
    new Set(activityItems.map((item) => item.id))
  );

  useEffect(() => {
    const nextExpanded = new Set<string>();
    activityItems.forEach((item) => {
      if (item.type === 'thinking') {
        nextExpanded.add(item.id);
        return;
      }
      const result = toolResultsMap.get(item.toolCall.id);
      const isExecuting = executingTools.has(item.toolCall.id);
      if (!result && !isExecuting) return;
      nextExpanded.add(item.id);
    });
    setExpandedItems(nextExpanded);
  }, [activityItems, executingTools, toolResultsMap]);

  useEffect(() => {
    const count = activityItems.length;
    const list = listRef.current;
    if (!list || count === 0) {
      prevCountRef.current = count;
      return;
    }
    if (count !== prevCountRef.current) {
      list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
      prevCountRef.current = count;
    }
  }, [activityItems.length]);

  const toggleItem = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const activityRows = useMemo(() => {
    return activityItems.map((item, index) => {
      const isExpanded = expandedItems.has(item.id);
      const isLast = index === activityItems.length - 1;
      const isFirst = index === 0;
      
      if (item.type === 'thinking') {
        // Extract first few words for preview
        const preview = item.content.trim().split(/\s+/).slice(0, 8).join(' ');
        const label = preview ? `thought: ${preview}${item.content.trim().split(/\s+/).length > 8 ? '...' : ''}` : 'thought:';
        return (
          <div 
            key={item.id} 
            className="group relative transition-all"
          >
            {/* Sequence connector line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--border)]/20 via-[var(--border)]/30 to-transparent" />
            {!isLast && (
              <div className="absolute left-6 top-[44px] bottom-0 w-px bg-[var(--border)]/20" />
            )}
            
            <div className="relative border-b border-[var(--border)]/30 last:border-b-0">
              <button
                onClick={() => toggleItem(item.id)}
                className="w-full px-4 py-3 pl-8 flex items-center gap-3 text-left transition-all duration-150"
              >
                {/* Sequence dot */}
                <div className="absolute left-5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[var(--accent)]/40 border-2 border-[var(--background)] z-10 transition-colors" />
                
                <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded bg-[var(--accent)]/10 transition-colors">
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3 text-[#b0a8a0]" />
                  ) : (
                    <ChevronRight className="h-3 w-3 text-[#b0a8a0]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[#d0c8c0]">{label}</span>
                    {item.isStreaming && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute h-full w-full rounded-full bg-[var(--warning)] opacity-75" />
                        <span className="relative h-2 w-2 rounded-full bg-[var(--warning)]" />
                      </span>
                    )}
                  </div>
                </div>
              </button>
              {isExpanded && (
                <div className="px-4 pb-3 pl-12">
                  <div className="text-xs text-[#b0a8a0] leading-relaxed whitespace-pre-wrap break-words overflow-x-auto">
                    {item.content}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }

      const tc = item.toolCall;
      const result = toolResultsMap.get(tc.id);
      const isExecuting = executingTools.has(tc.id);
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.function.arguments || '{}');
      } catch {}
      const mainArg = args.query || args.url || args.text || Object.values(args)[0];
      const parts = tc.function.name.split('__');
      const toolName = parts.length > 1 ? parts.slice(1).join('__') : tc.function.name;
      const hasContent = Boolean((mainArg != null && String(mainArg).trim()) || result?.content?.trim());

      return (
        <div 
          key={item.id} 
          className="group relative transition-all"
        >
          {/* Sequence connector line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-[var(--border)]/20 via-[var(--border)]/30 to-transparent" />
          {!isLast && (
            <div className="absolute left-6 top-[44px] bottom-0 w-px bg-[var(--border)]/20" />
          )}
          
          <div className="relative border-b border-[var(--border)]/30 last:border-b-0">
            <button
              onClick={() => toggleItem(item.id)}
              className="w-full px-4 py-3 pl-8 flex items-center gap-3 text-left transition-all duration-150"
            >
              {/* Sequence dot */}
              <div className={`absolute left-5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border-2 border-[var(--background)] z-10 transition-colors ${
                isExecuting 
                  ? 'bg-[var(--warning)]/60' 
                  : result 
                    ? result.isError 
                      ? 'bg-[var(--error)]/60'
                      : 'bg-[var(--success)]/60'
                    : 'bg-[var(--accent)]/40'
              }`} />
              
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded bg-[var(--accent)]/10 transition-colors">
                {isExecuting ? (
                  <Loader2 className="h-3 w-3 text-[var(--warning)] animate-spin" />
                ) : result ? (
                  result.isError ? (
                    <X className="h-3 w-3 text-[var(--error)]" />
                  ) : (
                    <Check className="h-3 w-3 text-[var(--success)]" />
                  )
                ) : (
                  hasContent ? (
                    isExpanded ? (
                      <ChevronDown className="h-3 w-3 text-[#b0a8a0]" />
                    ) : (
                      <ChevronRight className="h-3 w-3 text-[#b0a8a0]" />
                    )
                  ) : (
                    <span className="h-2 w-2 rounded-full border border-[var(--border)]" />
                  )
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#d0c8c0] truncate">{toolName}</div>
                {mainArg != null && !isExpanded && (
                  <div className="text-xs text-[#9a9590] truncate mt-0.5">{String(mainArg as string | number | boolean)}</div>
                )}
                {result && !isExpanded && !isExecuting && result.content && (
                  <div className={`text-[10px] mt-0.5 ${result.isError ? 'text-[var(--error)]/80' : 'text-[#9a9590]'} truncate`}>
                    {result.content}
                  </div>
                )}
              </div>
            </button>
            {isExpanded && (
              <div className="px-4 pb-3 pl-12 space-y-2">
                {mainArg != null && (
                  <div className="text-xs text-[#b0a8a0] break-words">
                    {String(mainArg as string | number | boolean)}
                  </div>
                )}
                {result && !isExecuting && (
                  <div className={`text-xs font-mono leading-relaxed whitespace-pre-wrap break-words max-h-96 overflow-y-auto ${
                    result.isError ? 'text-[var(--error)]' : 'text-[#b0a8a0]'
                  }`}>
                    {result.content}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    });
  }, [activityItems, executingTools, toolResultsMap, expandedItems]);

  return (
    <>
      {researchProgress && (
        <div className="px-3 py-2 border-b border-[var(--border)]/50">
          <div className="flex items-center gap-2 text-xs text-[#b0a8a0]">
            <Loader2 className="h-3 w-3 text-blue-500 animate-spin" />
            <span>{researchProgress.message || 'Researching...'}</span>
          </div>
        </div>
      )}

       <div className="flex flex-col min-h-0">
         <div className="px-3 py-2 text-xs font-medium text-[#b0a8a0] border-b border-[var(--border)]/50">
           <span className="uppercase tracking-wider text-[10px]">Activity</span>
           {toolCount > 0 && (
             <span className="ml-2 text-[10px] text-[#9a9590]">({toolCount})</span>
           )}
         </div>
         <div ref={listRef} className="relative overflow-y-auto">
           {activityRows}
           {activityRows.length === 0 && !researchProgress && !researchSources.length && !thinkingActive && !thinkingContent && (
             <div className="px-3 py-6 text-center text-xs text-[#9a9590]">No tool activity yet</div>
           )}
         </div>
       </div>

      {researchSources.length > 0 && (
        <div className="border-t border-[var(--border)]/50">
          <div className="px-3 py-2 text-xs font-medium text-[#b0a8a0] border-b border-[var(--border)]/50">
            <span className="uppercase tracking-wider text-[10px]">Sources</span>
          </div>
          <div>
            {researchSources.map((source, i) => (
              <a
                key={i}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-3 py-2 transition-colors border-b border-[var(--border)]/30 last:border-b-0"
              >
                <div className="text-xs line-clamp-1">{source.title}</div>
                <div className="text-[10px] text-[#9a9590] truncate mt-0.5">{source.url}</div>
              </a>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
