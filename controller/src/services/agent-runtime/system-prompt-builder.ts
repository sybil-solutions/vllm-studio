// CRITICAL

/**
 * Build the system prompt, optionally including agent-mode instructions.
 * @param session - Stored chat session record.
 * @param systemPrompt - User-provided system prompt.
 * @param agentMode - Whether agent mode is enabled.
 * @returns System prompt string or undefined.
 */
export function buildSystemPrompt(
  session: Record<string, unknown>,
  systemPrompt: string | undefined,
  agentMode: boolean,
): string | undefined {
  const base = (systemPrompt ?? "").trim();
  if (!agentMode) {
    return base || undefined;
  }
  const agentBlock = buildAgentModePrompt(session);
  if (!agentBlock) return base || undefined;
  return base ? `${base}\n\n${agentBlock}` : agentBlock;
}

/**
 * Build the agent-mode prompt block using the session agent state.
 * @param session - Stored chat session record.
 * @returns Agent-mode prompt or undefined.
 */
export function buildAgentModePrompt(session: Record<string, unknown>): string | undefined {
  const state = session["agent_state"] as Record<string, unknown> | undefined;
  const plan = state?.["plan"] as Record<string, unknown> | undefined;
  const steps = Array.isArray(plan?.["steps"]) ? (plan?.["steps"] as Array<Record<string, unknown>>) : [];

  const lines: string[] = [];
  lines.push("<agent_mode>");
  lines.push("You are in AGENT MODE with access to planning and file tools.");
  lines.push("");
  lines.push("## Workflow");
  lines.push("1. If NO <current_plan> exists: call create_plan ONCE with 3-8 steps.");
  lines.push("2. Execute each step using tools. Mark steps done with update_plan({ action: 'complete', step_index: N }).");
  lines.push("3. For files: write_file creates parent directories automatically - no need for make_directory.");
  lines.push("4. When updating a file you already wrote: overwrite the SAME path (do not create copies like *_v2.md). Use read_file first if needed.");
  lines.push("5. Continue until all steps are done, then summarize results.");
  lines.push("");
  lines.push("## Tool Examples");
  lines.push("- create_plan({ tasks: [{ title: 'Research X' }, { title: 'Write report' }] })");
  lines.push("- update_plan({ action: 'complete', step_index: 0 })");
  lines.push("- write_file({ path: 'research/notes.md', content: '# Notes\\n...' })");
  lines.push("- read_file({ path: 'notes.md' })");
  lines.push("");
  lines.push("## Rules");
  lines.push("- Do NOT loop on plan creation. Create plan ONCE.");
  lines.push("- Do NOT describe what you could do — just DO IT with tools.");
  lines.push("- Mark each step complete IMMEDIATELY after finishing it.");
  lines.push("- Prefer editing existing files over creating new ones. If you need to revise, read_file then write_file to the same path.");

  if (steps.length > 0) {
    const doneCount = steps.filter((s) => s["status"] === "done").length;
    const currentIndex = steps.findIndex((s) => s["status"] !== "done");
    const planLines = steps.map((step, index) => {
      const status = step["status"];
      const marker =
        status === "done"
          ? "[x]"
          : index === currentIndex
            ? "[>]"
            : status === "blocked"
              ? "[!]"
              : "[ ]";
      return `  ${marker} ${index}: ${String(step["title"] ?? "")}`;
    });

    lines.push("");
    lines.push("<current_plan>");
    lines.push(`Progress: ${doneCount}/${steps.length}`);
    lines.push(...planLines);
    if (currentIndex >= 0) {
      const currentStep = steps[currentIndex];
      if (currentStep) {
        lines.push(`Current step: ${currentIndex} — ${String(currentStep["title"] ?? "")}`);
      }
    } else {
      lines.push("All steps complete. Provide final summary.");
    }
    lines.push("</current_plan>");
  }

  lines.push("</agent_mode>");
  return lines.join("\n");
}
