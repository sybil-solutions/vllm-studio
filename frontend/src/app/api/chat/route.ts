// CRITICAL
import { streamText, jsonSchema, convertToModelMessages, tool, stepCountIs } from "ai";
import type { UIMessage } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { getApiSettings } from "@/lib/api-settings";

// Allow streaming responses up to 5 minutes
export const maxDuration = 300;

interface ToolDefinition {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  server?: string;
}

interface PostBody {
  messages: UIMessage[];
  model?: string;
  tools?: ToolDefinition[];
  system?: string;
}

// Agent state stored per-request (stateless - client manages persistence)
type AgentPlan = {
  steps: Array<{ title: string; status: string; notes?: string }>;
};

function getClientInfo(req: Request) {
  const ip =
    req.headers.get("CF-Connecting-IP") ||
    req.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    req.headers.get("X-Real-IP") ||
    "unknown";
  const country = req.headers.get("CF-IPCountry") || "-";
  return { ip, country };
}

// Agent tool definitions
const AGENT_TOOL_DEFS = [
  {
    name: "set_plan",
    description:
      "Create the execution plan. Call this FIRST before doing any work. " +
      "Each step should be a concrete, actionable task. After creating the plan, proceed to execute step 0.",
    input_schema: {
      type: "object" as const,
      properties: {
        steps: {
          type: "array" as const,
          description: "Array of plan steps (3-8 steps)",
          items: {
            type: "object" as const,
            properties: { title: { type: "string" as const, description: "Step description" } },
            required: ["title"] as const,
          },
        },
      },
      required: ["steps"] as const,
    },
  },
  {
    name: "update_plan",
    description: "Update a plan step's status. Call after completing each step to mark it done.",
    input_schema: {
      type: "object" as const,
      properties: {
        step_index: { type: "number" as const, description: "Zero-based index of the step" },
        status: { type: "string" as const, enum: ["done", "running", "blocked"] as const, description: "New status" },
        notes: { type: "string" as const, description: "Optional notes" },
      },
      required: ["step_index", "status"] as const,
    },
  },
];

// Execute agent tool and return result
function executeAgentTool(
  name: string,
  args: Record<string, unknown>,
  planRef: { current: AgentPlan | null },
): unknown {
  if (name === "set_plan") {
    const steps = (args.steps as Array<{ title: string }>) || [];
    planRef.current = { steps: steps.map((s) => ({ title: s.title, status: "pending" })) };
    return {
      success: true,
      message: `Plan created with ${steps.length} steps. Now execute step 0: "${steps[0]?.title}"`,
      plan: planRef.current,
    };
  }

  if (name === "update_plan") {
    if (!planRef.current) {
      return { success: false, error: "No plan exists. Call set_plan first." };
    }
    const idx = args.step_index as number;
    const step = planRef.current.steps[idx];
    if (!step) {
      return { success: false, error: `Invalid step_index: ${idx}` };
    }
    step.status = args.status as string;
    if (args.notes) step.notes = args.notes as string;

    const done = planRef.current.steps.filter((s) => s.status === "done").length;
    const total = planRef.current.steps.length;
    const next = planRef.current.steps.find((s) => s.status === "pending");

    return {
      success: true,
      message: next
        ? `Step ${idx} marked ${args.status}. Progress: ${done}/${total}. Next: "${next.title}"`
        : `Step ${idx} marked ${args.status}. All steps complete (${done}/${total}).`,
      plan: planRef.current,
    };
  }

  return { success: false, error: `Unknown agent tool: ${name}` };
}

// Build server-side agent tools with execute functions
function buildAgentTools(planRef: { current: AgentPlan | null }) {
  const entries = AGENT_TOOL_DEFS.map((def) => [
    def.name,
    tool({
      description: def.description,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inputSchema: jsonSchema(def.input_schema as any),
      execute: async (args) => executeAgentTool(def.name, args as Record<string, unknown>, planRef),
    }),
  ]);
  return Object.fromEntries(entries);
}

export async function POST(req: Request) {
  const client = getClientInfo(req);

  try {
    const body: PostBody = await req.json();
    const { messages, model, tools, system } = body;
    const resolvedModel = model || "default";

    const toolNames = (tools || []).map((t) => t.name).join(", ");
    console.log(
      `[CHAT] ip=${client.ip} | country=${client.country} | model=${resolvedModel} | messages=${messages?.length || 0} | tools=${tools?.length || 0}`,
    );
    if (toolNames) console.log(`[CHAT] tools=[${toolNames}]`);

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Messages required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const settings = await getApiSettings();
    const openaiCompatible = createOpenAICompatible({
      name: "vllm-studio",
      baseURL: `${settings.backendUrl}/v1`,
      apiKey: settings.apiKey || "sk-master",
    });
    const modelInstance = openaiCompatible(resolvedModel);

    // Core agent tools (server-executed with multi-step loop)
    const agentToolNames = new Set(["set_plan", "update_plan"]);
    const mcpTools = (tools || []).filter((t) => !agentToolNames.has(t.name));
    const hasAgentTools = (tools || []).some((t) => agentToolNames.has(t.name));

    // Build tool set
    const planRef = { current: null as AgentPlan | null };
    const agentTools = hasAgentTools ? buildAgentTools(planRef) : {};

    // MCP tools without execute (client-side)
    const mcpToolSet = mcpTools.reduce<Record<string, { description?: string; parameters: unknown }>>((acc, t) => {
      acc[t.name] = {
        description: t.description,
        parameters: jsonSchema(t.inputSchema || { type: "object", properties: {} }),
      };
      return acc;
    }, {});

    const allTools = { ...agentTools, ...mcpToolSet };
    const modelMessages = await convertToModelMessages(messages);

    // Note: When only agent tools are used, we can do multi-step. But if MCP tools
    // are present, we need single-step so the client can execute MCP tools.
    const hasMcpTools = mcpTools.length > 0;
    const useMultiStep = hasAgentTools && !hasMcpTools;

    const result = streamText({
      model: modelInstance,
      messages: modelMessages,
      system: system?.trim() || undefined,
      tools: allTools,
      stopWhen: useMultiStep ? stepCountIs(25) : stepCountIs(1),
      temperature: 0.7,
    });

    return result.toUIMessageStreamResponse({
      sendReasoning: true,
      messageMetadata: ({ part }) => {
        if (part.type === "start") return { model: resolvedModel };
        if (part.type === "finish") return { model: resolvedModel, usage: part.totalUsage };
        return undefined;
      },
      onError: (error) => {
        if (error == null) return "Unknown error";
        if (typeof error === "string") return error;
        if (error instanceof Error) return error.message;
        return JSON.stringify(error);
      },
    });
  } catch (error) {
    console.error(`[CHAT ERROR] ip=${client.ip} | country=${client.country} | error=${String(error)}`);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
