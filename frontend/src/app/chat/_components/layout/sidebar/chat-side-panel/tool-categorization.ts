// CRITICAL
import type { ActivityItem } from "@/app/chat/types";

export type ToolCategory = "file" | "search" | "plan" | "web" | "code" | "other";

const TOOL_CATEGORIES: Record<string, ToolCategory> = {
  read_file: "file",
  write_file: "file",
  list_files: "file",
  delete_file: "file",
  make_directory: "file",
  move_file: "file",
  create_file: "file",
  edit_file: "file",
  search: "search",
  grep: "search",
  find: "search",
  ripgrep: "search",
  semantic_search: "search",
  plan: "plan",
  update_plan: "plan",
  create_plan: "plan",
  web_search: "web",
  fetch_url: "web",
  browse: "web",
  http_request: "web",
  execute_code: "code",
  run_command: "code",
  bash: "code",
  python: "code",
  shell: "code",
};

export const categorize = (toolName?: string): ToolCategory => {
  if (!toolName) return "other";
  const lower = toolName.toLowerCase();
  for (const [pattern, category] of Object.entries(TOOL_CATEGORIES)) {
    if (lower === pattern || lower.includes(pattern)) return category;
  }
  if (lower.includes("file") || lower.includes("directory") || lower.includes("folder")) return "file";
  if (lower.includes("search") || lower.includes("find") || lower.includes("grep")) return "search";
  if (lower.includes("web") || lower.includes("fetch") || lower.includes("http") || lower.includes("url")) return "web";
  if (
    lower.includes("exec") ||
    lower.includes("run") ||
    lower.includes("shell") ||
    lower.includes("bash") ||
    lower.includes("command")
  ) {
    return "code";
  }
  return "other";
};

export const CATEGORY_META: Record<ToolCategory, { label: string; color: string; iconColor: string }> =
  {
    file: { label: "File ops", color: "var(--hl1)", iconColor: "var(--hl1)" },
    search: { label: "Search", color: "var(--hl1)", iconColor: "var(--hl1)" },
    plan: { label: "Planning", color: "var(--hl2)", iconColor: "var(--hl2)" },
    web: { label: "Web", color: "var(--accent)", iconColor: "var(--accent)" },
    code: { label: "Code", color: "var(--hl3)", iconColor: "var(--hl3)" },
    other: { label: "Tools", color: "var(--dim)", iconColor: "var(--dim)" },
  };

export const getTurnSummary = (items: ActivityItem[]): { label: string; count: number; color: string } => {
  const toolItems = items.filter((i) => i.type !== "thinking");
  if (toolItems.length === 0) return { label: "Thinking", count: 0, color: "var(--dim)" };
  const counts = new Map<ToolCategory, number>();
  for (const item of toolItems) {
    const cat = categorize(item.toolName);
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  let dominant: ToolCategory = "other";
  let max = 0;
  for (const [cat, count] of counts) {
    if (count > max) {
      dominant = cat;
      max = count;
    }
  }
  const meta = CATEGORY_META[dominant];
  return { label: `${meta.label} (${toolItems.length})`, count: toolItems.length, color: meta.color };
};

