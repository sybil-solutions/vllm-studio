export function buildRunSystemPrompt(
  basePrompt: string,
  attachmentsBlock?: string,
): string | undefined {
  const trimmed = basePrompt.trim();
  const blocks = [trimmed, attachmentsBlock?.trim()].filter(
    (block) => block && block.length > 0,
  ) as string[];
  if (blocks.length === 0) return undefined;
  return blocks.join("\n\n");
}

