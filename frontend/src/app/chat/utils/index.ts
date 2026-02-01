// CRITICAL
// Constants
const BOX_TAGS_PATTERN = /<\|(?:begin|end)_of_box\|>/g;

// Strip thinking tags for model context (keeps artifact code blocks)
export const stripThinkingForModelContext = (text: string): string => {
  if (!text) return text;
  let cleaned = text.replace(BOX_TAGS_PATTERN, "");
  const preservedBlocks: string[] = [];
  cleaned = cleaned.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, (block) => {
    const fenceRegex = /```([a-zA-Z0-9_-]+)?\s*\n([\s\S]*?)```/g;
    let m: RegExpExecArray | null;
    while ((m = fenceRegex.exec(block)) !== null) {
      const lang = (m[1] || "").toLowerCase();
      const isRenderable =
        ["html", "svg", "javascript", "js", "react", "jsx", "tsx"].includes(lang) ||
        lang.startsWith("artifact-");
      if (isRenderable) preservedBlocks.push(`\n\n\`\`\`${lang}\n${m[2].trim()}\n\`\`\``);
    }
    return "";
  });
  cleaned = cleaned.replace(/<\/?think(?:ing)?>/gi, "");
  return (cleaned.trim() + preservedBlocks.join("")).trim();
};

// Try to parse nested JSON from string
export function tryParseNestedJsonString(raw: string): Record<string, unknown> | null {
  try {
    const trimmed = raw.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) return JSON.parse(trimmed);
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {}
  return null;
}
