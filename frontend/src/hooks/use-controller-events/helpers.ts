// CRITICAL
import type { AgentPlan } from "@/app/chat/_components/agent/agent-types";
import { normalizePlanSteps } from "@/app/chat/_components/agent/agent-types";

export const normalizePlan = (value: unknown): AgentPlan | null => {
  if (!value || typeof value !== "object") return null;
  const plan = value as Partial<AgentPlan> & { tasks?: unknown };
  const steps = normalizePlanSteps(plan.steps ?? plan.tasks);
  if (steps.length === 0) return null;
  return {
    steps,
    createdAt: typeof plan.createdAt === "number" ? plan.createdAt : Date.now(),
    updatedAt: typeof plan.updatedAt === "number" ? plan.updatedAt : Date.now(),
  };
};

export const dispatchCustomEvent = (name: string, detail: Record<string, unknown>) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
};

