// CRITICAL
import { randomUUID } from "node:crypto";
import type { AgentTool, AgentToolResult } from "@mariozechner/pi-agent-core";
import type { TSchema } from "@sinclair/typebox";
import type { AppContext } from "../../types/context";
import { Event } from "../event-manager";
import { createTextResult } from "./tool-registry-common";
import type { AgentToolRegistryOptions } from "./tool-registry";

const loadAgentPlan = (context: AppContext, sessionId: string): Record<string, unknown> | null => {
  const session = context.stores.chatStore.getSessionSummary(sessionId);
  if (!session) return null;
  const raw = session["agent_state"];
  if (!raw || typeof raw !== "object") return null;
  return raw as Record<string, unknown>;
};

const normalizePlanStatus = (value: unknown): "pending" | "running" | "done" | "blocked" => {
  switch (value) {
    case "running":
    case "done":
    case "blocked":
      return value;
    default:
      return "pending";
  }
};

const normalizePlanSteps = (tasks: unknown): Array<Record<string, unknown>> => {
  if (!Array.isArray(tasks)) return [];
  const steps: Array<Record<string, unknown>> = [];
  for (const task of tasks) {
    if (!task) continue;
    if (typeof task === "string") {
      const title = task.trim();
      if (!title) continue;
      steps.push({
        id: randomUUID(),
        title,
        status: "pending",
      });
      continue;
    }
    if (typeof task !== "object") continue;
    const record = task as Record<string, unknown>;
    const titleCandidate =
      record["title"] ??
      record["name"] ??
      record["step"] ??
      record["task"] ??
      record["description"];
    const title = typeof titleCandidate === "string" ? titleCandidate.trim() : "";
    if (!title) continue;
    steps.push({
      id: typeof record["id"] === "string" ? record["id"] : randomUUID(),
      title,
      status: normalizePlanStatus(record["status"]),
      ...(typeof record["notes"] === "string" && record["notes"].trim() ? { notes: record["notes"] } : {}),
    });
  }
  return steps;
};

const persistAgentPlan = (context: AppContext, sessionId: string, plan: Record<string, unknown> | null): void => {
  const agentState = plan
    ? { plan, tasks: (plan["steps"] as Array<Record<string, unknown>> | undefined) ?? undefined }
    : null;
  context.stores.chatStore.updateSession(sessionId, undefined, undefined, agentState);
};

/**
 * Build agent "plan" tools.
 * @param context - Application context.
 * @param options - Tool registry options.
 * @returns Agent tools.
 */
export const buildPlanTools = (context: AppContext, options: AgentToolRegistryOptions): AgentTool[] => {
  const emit = options.emitEvent;

  const createPlanTool = (name: string, description: string): AgentTool => ({
    name,
    label: name,
    description,
    parameters: {
      type: "object",
      properties: {
        tasks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              status: { type: "string", enum: ["pending", "running", "done", "blocked"] },
              notes: { type: "string" },
            },
            required: ["title"],
          },
        },
        steps: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              status: { type: "string", enum: ["pending", "running", "done", "blocked"] },
              notes: { type: "string" },
            },
            required: ["title"],
          },
        },
        plan: { type: "object" },
      },
      required: [],
    } as unknown as TSchema,
    execute: async (_toolCallId, params): Promise<AgentToolResult<Record<string, unknown>>> => {
      const raw = params as Record<string, unknown>;
      const planArgument = raw["plan"] as Record<string, unknown> | undefined;
      const tasks = raw["tasks"] ?? raw["steps"] ?? planArgument?.["tasks"] ?? planArgument?.["steps"];
      const steps = normalizePlanSteps(tasks);
      if (steps.length === 0) {
        throw new Error("No valid plan steps provided.");
      }
      const now = Date.now();
      const plan = { steps, createdAt: now, updatedAt: now };
      persistAgentPlan(context, options.sessionId, plan);
      emit?.("plan_updated", { session_id: options.sessionId, plan });
      await context.eventManager.publish(new Event("agent_plan_updated", { session_id: options.sessionId, plan }));
      return createTextResult("Plan created.", { plan });
    },
  });

  const updatePlanTool: AgentTool = {
    name: "update_plan",
    label: "update_plan",
    description: "Update the plan by adding, editing, completing, or deleting a step.",
    parameters: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["add", "edit", "update", "delete", "complete", "status"] },
        step_index: { type: "number" },
        title: { type: "string" },
        status: { type: "string", enum: ["pending", "running", "done", "blocked"] },
        notes: { type: "string" },
      },
      required: ["action"],
    } as unknown as TSchema,
    execute: async (_toolCallId, params): Promise<AgentToolResult<Record<string, unknown>>> => {
      const raw = params as Record<string, unknown>;
      const action = typeof raw["action"] === "string" ? raw["action"] : "";
      const stepIndex = typeof raw["step_index"] === "number" ? raw["step_index"] : -1;
      const currentState = loadAgentPlan(context, options.sessionId);
      const currentPlan = currentState?.["plan"] as Record<string, unknown> | undefined;
      const steps = normalizePlanSteps(currentPlan?.["steps"] ?? currentState?.["tasks"]);
      if (steps.length === 0) {
        throw new Error("No active plan. Call create_plan first.");
      }

      if (["add"].includes(action)) {
        const title = typeof raw["title"] === "string" ? raw["title"].trim() : "";
        if (!title) throw new Error("Title is required for add.");
        steps.push({
          id: randomUUID(),
          title,
          status: normalizePlanStatus(raw["status"]),
          ...(typeof raw["notes"] === "string" && raw["notes"].trim() ? { notes: raw["notes"] } : {}),
        });
      } else {
        if (stepIndex < 0 || stepIndex >= steps.length) {
          throw new Error("Invalid step_index.");
        }
        const step = steps[stepIndex] ?? {};
        if (action === "delete") {
          steps.splice(stepIndex, 1);
        } else if (action === "complete") {
          step["status"] = "done";
        } else if (action === "status") {
          step["status"] = normalizePlanStatus(raw["status"]);
        } else if (action === "edit" || action === "update") {
          if (typeof raw["title"] === "string" && raw["title"].trim()) {
            step["title"] = raw["title"].trim();
          }
          if (raw["status"] !== undefined) {
            step["status"] = normalizePlanStatus(raw["status"]);
          }
          if (typeof raw["notes"] === "string") {
            step["notes"] = raw["notes"];
          }
        } else {
          throw new Error(`Unsupported action: ${action}`);
        }
        steps[stepIndex] = step;
      }

      const now = Date.now();
      const plan = {
        steps,
        createdAt: typeof currentPlan?.["createdAt"] === "number" ? currentPlan["createdAt"] : now,
        updatedAt: now,
      };
      persistAgentPlan(context, options.sessionId, plan);
      emit?.("plan_updated", { session_id: options.sessionId, plan });
      await context.eventManager.publish(new Event("agent_plan_updated", { session_id: options.sessionId, plan }));
      return createTextResult("Plan updated.", { plan });
    },
  };

  return [
    createPlanTool("create_plan", "Create or replace the execution plan. Call this once before doing any work."),
    createPlanTool("set_plan", "Alias for create_plan. Create or replace the execution plan."),
    updatePlanTool,
  ];
};

