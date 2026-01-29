// CRITICAL
"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAppStore } from "@/store";
import { normalizePlanSteps, normalizeTasks } from "../_components/agent/agent-types";
import type { AgentPlan, AgentPlanStep, AgentTask } from "../_components/agent/agent-types";
import { useAgentFiles } from "./use-agent-files";

/**
 * Synthetic tool definitions injected when agent mode is on.
 * The model calls set_plan to create a checklist, then update_plan
 * to mark each step done/running/blocked as it works.
 */
const SET_PLAN_TOOL = {
  name: "set_plan",
  server: "__agent__",
  description:
    "Create or replace the execution plan. Call this BEFORE doing any work. " +
    "Each step should be a concrete, actionable task. " +
    "After creating the plan, proceed to execute step 0.",
  inputSchema: {
    type: "object" as const,
    properties: {
      steps: {
        type: "array" as const,
        description: "Array of plan steps",
        items: {
          type: "object" as const,
          properties: {
            title: {
              type: "string" as const,
              description: "Short description of this step",
            },
          },
          required: ["title"],
        },
      },
    },
    required: ["steps"],
  },
};

const UPDATE_PLAN_TOOL = {
  name: "update_plan",
  server: "__agent__",
  description:
    "Update a plan step's status. Call this after completing each step " +
    'to mark it "done", or "blocked" if it cannot proceed. ' +
    "Always update the current step before moving to the next one.",
  inputSchema: {
    type: "object" as const,
    properties: {
      step_index: {
        type: "number" as const,
        description: "Zero-based index of the step to update",
      },
      status: {
        type: "string" as const,
        enum: ["done", "running", "blocked"],
        description: "New status for the step",
      },
      notes: {
        type: "string" as const,
        description: "Optional notes about the result of this step",
      },
    },
    required: ["step_index", "status"],
  },
};

const SET_TASKS_TOOL = {
  name: "set_tasks",
  server: "__agent__",
  description:
    "Create or replace the task list. Use this to track TODOs that are " +
    "separate from the execution plan.",
  inputSchema: {
    type: "object" as const,
    properties: {
      tasks: {
        type: "array" as const,
        description: "Array of task items",
        items: {
          type: "object" as const,
          properties: {
            title: { type: "string" as const },
          },
          required: ["title"],
        },
      },
    },
    required: ["tasks"],
  },
};

const ADD_TASK_TOOL = {
  name: "add_task",
  server: "__agent__",
  description: "Append a new task to the task list.",
  inputSchema: {
    type: "object" as const,
    properties: {
      title: { type: "string" as const },
    },
    required: ["title"],
  },
};

const UPDATE_TASK_TOOL = {
  name: "update_task",
  server: "__agent__",
  description: "Update a task status or notes.",
  inputSchema: {
    type: "object" as const,
    properties: {
      task_index: {
        type: "number" as const,
        description: "Zero-based index of the task to update",
      },
      status: {
        type: "string" as const,
        enum: ["done", "running", "blocked"],
        description: "New status for the task",
      },
      notes: { type: "string" as const },
    },
    required: ["task_index", "status"],
  },
};

const REMOVE_TASK_TOOL = {
  name: "remove_task",
  server: "__agent__",
  description: "Remove a task from the task list.",
  inputSchema: {
    type: "object" as const,
    properties: {
      task_index: { type: "number" as const },
    },
    required: ["task_index"],
  },
};

const LIST_FILES_TOOL = {
  name: "list_files",
  server: "__agent__",
  description: "List files in the agent workspace.",
  inputSchema: {
    type: "object" as const,
    properties: {
      path: { type: "string" as const, description: "Optional subdirectory" },
      recursive: { type: "boolean" as const, description: "Recursively list" },
    },
  },
};

const READ_FILE_TOOL = {
  name: "read_file",
  server: "__agent__",
  description: "Read a file from the agent workspace.",
  inputSchema: {
    type: "object" as const,
    properties: {
      path: { type: "string" as const, description: "Relative path" },
    },
    required: ["path"],
  },
};

const WRITE_FILE_TOOL = {
  name: "write_file",
  server: "__agent__",
  description: "Write or overwrite a file in the agent workspace.",
  inputSchema: {
    type: "object" as const,
    properties: {
      path: { type: "string" as const, description: "Relative path" },
      content: { type: "string" as const, description: "File contents" },
    },
    required: ["path", "content"],
  },
};

const DELETE_FILE_TOOL = {
  name: "delete_file",
  server: "__agent__",
  description: "Delete a file from the agent workspace.",
  inputSchema: {
    type: "object" as const,
    properties: {
      path: { type: "string" as const },
    },
    required: ["path"],
  },
};

const MKDIR_TOOL = {
  name: "make_directory",
  server: "__agent__",
  description: "Create a directory in the agent workspace.",
  inputSchema: {
    type: "object" as const,
    properties: {
      path: { type: "string" as const },
    },
    required: ["path"],
  },
};

const MOVE_FILE_TOOL = {
  name: "move_file",
  server: "__agent__",
  description: "Move or rename a file in the agent workspace.",
  inputSchema: {
    type: "object" as const,
    properties: {
      from: { type: "string" as const },
      to: { type: "string" as const },
    },
    required: ["from", "to"],
  },
};

export function useAgentTools() {
  const agentPlan = useAppStore((s) => s.agentPlan);
  const setAgentPlan = useAppStore((s) => s.setAgentPlan);
  const agentTasks = useAppStore((s) => s.agentTasks);
  const setAgentTasks = useAppStore((s) => s.setAgentTasks);

  const {
    loadAgentFiles,
    readAgentFile,
    writeAgentFile,
    deleteAgentFile,
    createAgentDirectory,
    moveAgentFile,
  } = useAgentFiles();

  // Live ref so executeAgentTool always reads the latest plan,
  // even when called multiple times within the same streaming response
  // before React re-renders.
  const planRef = useRef<AgentPlan | null>(agentPlan);
  useEffect(() => { planRef.current = agentPlan; }, [agentPlan]);

  const tasksRef = useRef<AgentTask[]>(agentTasks);
  useEffect(() => { tasksRef.current = agentTasks; }, [agentTasks]);

  /** The tool defs to merge into the tool list */
  const agentToolDefs = useMemo(
    () => [
      SET_PLAN_TOOL,
      UPDATE_PLAN_TOOL,
      SET_TASKS_TOOL,
      ADD_TASK_TOOL,
      UPDATE_TASK_TOOL,
      REMOVE_TASK_TOOL,
      LIST_FILES_TOOL,
      READ_FILE_TOOL,
      WRITE_FILE_TOOL,
      DELETE_FILE_TOOL,
      MKDIR_TOOL,
      MOVE_FILE_TOOL,
    ],
    [],
  );

  /** Handle a synthetic agent tool call. Returns the tool result string. */
  const executeAgentTool = useCallback(
    async (
      toolName: string,
      args: Record<string, unknown>,
      options?: { sessionId?: string | null },
    ): Promise<string | null> => {
      if (toolName === "set_plan") {
        const steps = normalizePlanSteps(args.steps);
        if (steps.length === 0) {
          return JSON.stringify({
            success: false,
            error:
              "Plan must include a steps array with a title for each step.",
            hint: 'Example: set_plan({ steps: [{ title: "Research topic" }, { title: "Draft outline" }] })',
          });
        }
        const plan: AgentPlan = {
          steps,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        planRef.current = plan;
        setAgentPlan(plan);
        return JSON.stringify({
          success: true,
          plan: { steps: plan.steps },
          message: `Plan created with ${steps.length} steps. Proceed to execute step 0.`,
        });
      }

      if (toolName === "update_plan") {
        const live = planRef.current;
        if (!live) {
          return JSON.stringify({
            success: false,
            error: "No active plan. Call set_plan first.",
          });
        }
        const rawIdx = args.step_index;
        const idx =
          typeof rawIdx === "number"
            ? rawIdx
            : typeof rawIdx === "string"
              ? parseInt(rawIdx, 10)
              : -1;
        const maxIdx = live.steps.length - 1;
        if (!Number.isFinite(idx) || idx < 0 || idx > maxIdx) {
          return JSON.stringify({
            success: false,
            error: `Invalid step_index: ${idx}. Valid range is 0–${maxIdx}.`,
            currentPlan: live.steps.map(
              (s, i) => `${i}: ${s.title} [${s.status}]`,
            ),
          });
        }
        const rawStatus =
          typeof args.status === "string" ? args.status : "done";
        const status: AgentPlanStep["status"] =
          rawStatus === "running" || rawStatus === "done" || rawStatus === "blocked"
            ? rawStatus
            : "done";

        const notes =
          typeof args.notes === "string" && args.notes.trim()
            ? args.notes.trim()
            : undefined;

        const updatedSteps = live.steps.map((s, i) =>
          i === idx ? { ...s, status, ...(notes ? { notes } : {}) } : s,
        );
        const updated: AgentPlan = {
          ...live,
          steps: updatedSteps,
          updatedAt: Date.now(),
        };
        planRef.current = updated;
        setAgentPlan(updated);

        const doneCount = updatedSteps.filter(
          (s) => s.status === "done",
        ).length;
        const nextIdx = updatedSteps.findIndex(
          (s) => s.status !== "done",
        );

        return JSON.stringify({
          success: true,
          step: idx,
          status,
          progress: `${doneCount}/${updatedSteps.length}`,
          ...(nextIdx >= 0
            ? { nextStep: nextIdx, nextTitle: updatedSteps[nextIdx].title }
            : { allDone: true }),
        });
      }

      if (toolName === "set_tasks") {
        const tasks = normalizeTasks(args.tasks);
        if (tasks.length === 0) {
          return JSON.stringify({
            success: false,
            error: "Tasks must include a list of titles.",
          });
        }
        tasksRef.current = tasks;
        setAgentTasks(tasks);
        return JSON.stringify({
          success: true,
          tasks,
          message: `Task list replaced with ${tasks.length} items.`,
        });
      }

      if (toolName === "add_task") {
        const title = typeof args.title === "string" ? args.title.trim() : "";
        if (!title) {
          return JSON.stringify({
            success: false,
            error: "Task title is required.",
          });
        }
        const current = tasksRef.current ?? [];
        const next: AgentTask[] = [
          ...current,
          {
            id: `task-${current.length}`,
            title,
            status: "pending",
          },
        ];
        tasksRef.current = next;
        setAgentTasks(next);
        return JSON.stringify({
          success: true,
          tasks: next,
          message: `Task added: ${title}`,
        });
      }

      if (toolName === "update_task") {
        const current = tasksRef.current ?? [];
        const rawIdx = args.task_index;
        const idx =
          typeof rawIdx === "number"
            ? rawIdx
            : typeof rawIdx === "string"
              ? parseInt(rawIdx, 10)
              : -1;
        if (!Number.isFinite(idx) || idx < 0 || idx >= current.length) {
          return JSON.stringify({
            success: false,
            error: `Invalid task_index: ${idx}.`,
          });
        }
        const rawStatus = typeof args.status === "string" ? args.status : "done";
        const status: AgentTask["status"] =
          rawStatus === "running" || rawStatus === "done" || rawStatus === "blocked"
            ? rawStatus
            : "done";
        const notes =
          typeof args.notes === "string" && args.notes.trim()
            ? args.notes.trim()
            : undefined;
        const next = current.map((task, i) =>
          i === idx ? { ...task, status, ...(notes ? { notes } : {}) } : task,
        );
        tasksRef.current = next;
        setAgentTasks(next);
        return JSON.stringify({
          success: true,
          task: idx,
          status,
        });
      }

      if (toolName === "remove_task") {
        const current = tasksRef.current ?? [];
        const rawIdx = args.task_index;
        const idx =
          typeof rawIdx === "number"
            ? rawIdx
            : typeof rawIdx === "string"
              ? parseInt(rawIdx, 10)
              : -1;
        if (!Number.isFinite(idx) || idx < 0 || idx >= current.length) {
          return JSON.stringify({
            success: false,
            error: `Invalid task_index: ${idx}.`,
          });
        }
        const next = current.filter((_, i) => i !== idx);
        tasksRef.current = next;
        setAgentTasks(next);
        return JSON.stringify({
          success: true,
          tasks: next,
        });
      }

      if (toolName === "list_files") {
        try {
          const path = typeof args.path === "string" ? args.path : undefined;
          const recursive = typeof args.recursive === "boolean" ? args.recursive : undefined;
          const files = await loadAgentFiles({
            sessionId: options?.sessionId ?? undefined,
            path,
            recursive,
          });
          return JSON.stringify({ success: true, files });
        } catch (err) {
          return JSON.stringify({
            success: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      if (toolName === "read_file") {
        const path = typeof args.path === "string" ? args.path : "";
        if (!path) {
          return JSON.stringify({ success: false, error: "path is required" });
        }
        try {
          const result = await readAgentFile(path, options?.sessionId ?? undefined);
          return JSON.stringify({
            success: true,
            path: result.path,
            content: result.content,
          });
        } catch (err) {
          return JSON.stringify({
            success: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      if (toolName === "write_file") {
        const path = typeof args.path === "string" ? args.path : "";
        const content = typeof args.content === "string" ? args.content : "";
        if (!path) {
          return JSON.stringify({ success: false, error: "path is required" });
        }
        try {
          await writeAgentFile(path, content, options?.sessionId ?? undefined);
          return JSON.stringify({ success: true, path });
        } catch (err) {
          return JSON.stringify({
            success: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      if (toolName === "delete_file") {
        const path = typeof args.path === "string" ? args.path : "";
        if (!path) {
          return JSON.stringify({ success: false, error: "path is required" });
        }
        try {
          await deleteAgentFile(path, options?.sessionId ?? undefined);
          return JSON.stringify({ success: true, path });
        } catch (err) {
          return JSON.stringify({
            success: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      if (toolName === "make_directory") {
        const path = typeof args.path === "string" ? args.path : "";
        if (!path) {
          return JSON.stringify({ success: false, error: "path is required" });
        }
        try {
          await createAgentDirectory(path, options?.sessionId ?? undefined);
          return JSON.stringify({ success: true, path });
        } catch (err) {
          return JSON.stringify({
            success: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      if (toolName === "move_file") {
        const from = typeof args.from === "string" ? args.from : "";
        const to = typeof args.to === "string" ? args.to : "";
        if (!from || !to) {
          return JSON.stringify({
            success: false,
            error: "from and to are required",
          });
        }
        try {
          await moveAgentFile(from, to, options?.sessionId ?? undefined);
          return JSON.stringify({ success: true, from, to });
        } catch (err) {
          return JSON.stringify({
            success: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      return null; // not an agent tool
    },
    [
      setAgentPlan,
      setAgentTasks,
      loadAgentFiles,
      readAgentFile,
      writeAgentFile,
      deleteAgentFile,
      createAgentDirectory,
      moveAgentFile,
    ],
  );

  /** Check if a tool name is a synthetic agent tool */
  const isAgentTool = useCallback(
    (toolName: string) =>
      toolName === "set_plan" ||
      toolName === "update_plan" ||
      toolName === "set_tasks" ||
      toolName === "add_task" ||
      toolName === "update_task" ||
      toolName === "remove_task" ||
      toolName === "list_files" ||
      toolName === "read_file" ||
      toolName === "write_file" ||
      toolName === "delete_file" ||
      toolName === "make_directory" ||
      toolName === "move_file",
    [],
  );

  /** Build the agent system-prompt section injected when agent mode is on */
  const buildAgentSystemPrompt = useCallback((): string => {
    const lines: string[] = [];

    lines.push("<agent_mode>");
    lines.push("You are in AGENT MODE. You have access to tools and MUST follow this workflow:");
    lines.push("");
    lines.push("1. ALWAYS call set_plan first to create a step-by-step plan before doing any work.");
    lines.push("2. Execute each step using available tools.");
    lines.push('3. After completing each step, call update_plan to mark it "done".');
    lines.push("4. Use set_tasks/add_task/update_task to maintain a TODO list separate from the plan.");
    lines.push("5. Use list_files/read_file/write_file to manage files in the agent workspace.");
    lines.push("6. If a step is blocked, mark it \"blocked\" and move to the next feasible step.");
    lines.push("7. After all steps are done, provide a final summary of results.");
    lines.push("");
    lines.push("Plans should have 3–8 concrete, actionable steps.");
    lines.push("Do NOT skip calling set_plan. Do NOT describe actions you could take — execute them.");

    if (agentPlan && agentPlan.steps.length > 0) {
      const steps = agentPlan.steps;
      const doneCount = steps.filter((s) => s.status === "done").length;
      const currentIdx = steps.findIndex((s) => s.status !== "done");
      const planLines = steps.map((s, i) => {
        const marker =
          s.status === "done"
            ? "[x]"
            : i === currentIdx
              ? "[>]"
              : s.status === "blocked"
                ? "[!]"
                : "[ ]";
        return `  ${marker} ${i}: ${s.title}`;
      });

      lines.push("");
      lines.push("<current_plan>");
      lines.push(`Progress: ${doneCount}/${steps.length}`);
      lines.push(...planLines);
      if (currentIdx >= 0) {
        lines.push(`Current step: ${currentIdx} — ${steps[currentIdx].title}`);
      } else {
        lines.push("All steps complete. Provide final summary.");
      }
      lines.push("</current_plan>");
    }

    if (agentTasks && agentTasks.length > 0) {
      const taskLines = agentTasks.map((task, i) => {
        const marker =
          task.status === "done"
            ? "[x]"
            : task.status === "running"
              ? "[>]"
              : task.status === "blocked"
                ? "[!]"
                : "[ ]";
        return `  ${marker} ${i}: ${task.title}`;
      });
      lines.push("");
      lines.push("<current_tasks>");
      lines.push(...taskLines);
      lines.push("</current_tasks>");
    }

    lines.push("</agent_mode>");
    return lines.join("\n");
  }, [agentPlan, agentTasks]);

  return {
    agentToolDefs,
    executeAgentTool,
    isAgentTool,
    buildAgentSystemPrompt,
    agentPlan,
    agentTasks,
    clearPlan: useCallback(() => {
      planRef.current = null;
      setAgentPlan(null);
    }, [setAgentPlan]),
    clearTasks: useCallback(() => {
      tasksRef.current = [];
      setAgentTasks([]);
    }, [setAgentTasks]),
  };
}
