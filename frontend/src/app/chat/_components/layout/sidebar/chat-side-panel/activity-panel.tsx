// CRITICAL
"use client";

import { Loader2 } from "lucide-react";
import type { ActivityGroup } from "@/app/chat/types";
import { TurnGroup } from "./turn-group";

export interface ActivityPanelProps {
  activityGroups: ActivityGroup[];
  agentPlan?: { steps: Array<{ status: string; title: string }> } | null;
  isLoading?: boolean;
}

export function ActivityPanel({ activityGroups, agentPlan, isLoading }: ActivityPanelProps) {
  if (activityGroups.length === 0) {
    return <div className="py-8 text-center text-sm text-[#8a93a5]">No activity yet</div>;
  }

  const totalSteps = agentPlan?.steps.length ?? 0;
  const doneSteps = agentPlan?.steps.filter((s) => s.status === "done").length ?? 0;
  const currentStep = agentPlan?.steps.find((s) => s.status === "running");
  const hasIncomplete = doneSteps < totalSteps;

  const latestGroup = activityGroups[0];
  const hasActiveThinking = latestGroup?.items.some((i) => i.type === "thinking" && i.isActive);

  return (
    <div className="h-full flex flex-col bg-[radial-gradient(140%_70%_at_12%_-10%,rgba(45,255,199,0.08),transparent_55%),radial-gradient(130%_80%_at_90%_-20%,rgba(108,140,255,0.12),transparent_60%),linear-gradient(180deg,#07080a,rgba(4,4,6,0.98))]">
      {totalSteps > 0 && (
        <div className="px-3 py-3 border-b border-white/[0.08] mb-2 bg-[#08090b]/90">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-[#9aa3b2]">Plan Progress</span>
            <span className="text-[10px] text-[#6f7785] font-mono">
              {doneSteps}/{totalSteps}
            </span>
          </div>
          <div className="h-1 w-full rounded-full bg-[#101114] overflow-hidden">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#32f2c2,#6aa2ff)] transition-all duration-300"
              style={{ width: `${totalSteps > 0 ? (doneSteps / totalSteps) * 100 : 0}%` }}
            />
          </div>
          {currentStep && isLoading && (
            <div className="flex items-center gap-2 mt-2">
              <Loader2 className="h-3 w-3 text-[#7aa6ff] animate-spin" />
              <span className="text-[11px] text-[#9aa3b2] truncate">{currentStep.title}</span>
            </div>
          )}
          {!currentStep && hasIncomplete && isLoading && (
            <div className="flex items-center gap-2 mt-2">
              <Loader2 className="h-3 w-3 text-[#7aa6ff] animate-spin" />
              <span className="text-[11px] text-[#9aa3b2]">Working...</span>
            </div>
          )}
        </div>
      )}

      <div className="relative flex-1 overflow-y-auto px-2">
        <div className="absolute left-4.75 top-2 bottom-2 w-px bg-white/[0.08]" />

        <div className="space-y-1 pb-4">
          {activityGroups.map((group) => (
            <TurnGroup
              key={`${group.id}:${group.isLatest ? "latest" : "past"}`}
              group={group}
              hasActiveThinking={group.isLatest && Boolean(hasActiveThinking)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

