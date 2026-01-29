// CRITICAL
import type { AgentPlan, AgentPlanStep, AgentTask, AgentTaskStatus } from "@/lib/types";

export type AgentPlanStepStatus = AgentTaskStatus;
export type { AgentPlan, AgentPlanStep, AgentTask, AgentTaskStatus };

const normalizeStatus = (value: unknown): AgentTaskStatus => {
  if (typeof value !== "string") return "pending";
  const normalized = value.toLowerCase();
  if (normalized === "running" || normalized === "done" || normalized === "blocked") {
    return normalized;
  }
  return "pending";
};

export function normalizePlanSteps(
  input: unknown,
  maxSteps = 12,
): AgentPlanStep[] {
  const rawSteps = Array.isArray(input) ? input : [];
  const normalized: AgentPlanStep[] = [];

  for (const step of rawSteps) {
    let title = "";
    let status: AgentTaskStatus = "pending";
    let notes: string | undefined;

    if (typeof step === "string") {
      title = step.trim();
    } else if (step && typeof step === "object") {
      const s = step as Record<string, unknown>;
      if (typeof s.title === "string") title = s.title.trim();
      status = normalizeStatus(s.status);
      if (typeof s.notes === "string" && s.notes.trim()) {
        notes = s.notes.trim();
      }
    }

    if (!title) continue;
    normalized.push({
      id: `step-${normalized.length}`,
      title,
      status,
      ...(notes ? { notes } : {}),
    });
    if (normalized.length >= maxSteps) break;
  }
  return normalized;
}

export function normalizeTasks(
  input: unknown,
  maxTasks = 24,
): AgentTask[] {
  const rawTasks = Array.isArray(input) ? input : [];
  const normalized: AgentTask[] = [];

  for (const task of rawTasks) {
    let title = "";
    let status: AgentTaskStatus = "pending";
    let notes: string | undefined;

    if (typeof task === "string") {
      title = task.trim();
    } else if (task && typeof task === "object") {
      const t = task as Record<string, unknown>;
      if (typeof t.title === "string") title = t.title.trim();
      status = normalizeStatus(t.status);
      if (typeof t.notes === "string" && t.notes.trim()) {
        notes = t.notes.trim();
      }
    }

    if (!title) continue;
    normalized.push({
      id: `task-${normalized.length}`,
      title,
      status,
      ...(notes ? { notes } : {}),
    });
    if (normalized.length >= maxTasks) break;
  }
  return normalized;
}
