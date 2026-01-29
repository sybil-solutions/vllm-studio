// CRITICAL
"use client";

import { useCallback } from "react";
import { api } from "@/lib/api";
import type { AgentState, AgentPlan, AgentTask, ChatSessionDetail } from "@/lib/types";
import { useAppStore } from "@/store";

const normalizeTasks = (value: unknown): AgentTask[] =>
  Array.isArray(value)
    ? value.filter((task): task is AgentTask => Boolean(task && typeof task === "object" && "title" in task))
    : [];

const normalizePlan = (value: unknown): AgentPlan | null => {
  if (!value || typeof value !== "object") return null;
  const plan = value as AgentPlan;
  if (!Array.isArray(plan.steps)) return null;
  return plan;
};

export function useAgentState() {
  const setAgentPlan = useAppStore((state) => state.setAgentPlan);
  const setAgentTasks = useAppStore((state) => state.setAgentTasks);

  const hydrateAgentState = useCallback(
    (session: ChatSessionDetail | null) => {
      const rawState = session?.agent_state ?? null;
      if (!rawState || typeof rawState !== "object") {
        setAgentPlan(null);
        setAgentTasks([]);
        return;
      }
      const agentState = rawState as AgentState;
      const plan = normalizePlan(agentState.plan);
      const tasks = normalizeTasks(agentState.tasks);
      setAgentPlan(plan);
      setAgentTasks(tasks);
    },
    [setAgentPlan, setAgentTasks],
  );

  const buildAgentState = useCallback(
    (plan: AgentPlan | null, tasks: AgentTask[]): AgentState => ({
      plan: plan ?? null,
      tasks,
    }),
    [],
  );

  const persistAgentState = useCallback(
    async (sessionId: string, state: AgentState) => {
      await api.updateChatSession(sessionId, { agent_state: state });
    },
    [],
  );

  return {
    hydrateAgentState,
    persistAgentState,
    buildAgentState,
  };
}
