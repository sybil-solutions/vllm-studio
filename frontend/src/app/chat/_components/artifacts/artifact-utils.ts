// CRITICAL
import type { Artifact } from "@/lib/types";

export function extractArtifacts(
  content: string,
  options?: { includeImplicit?: boolean; maxImplicit?: number },
): { text: string; artifacts: Artifact[] } {
  const artifacts: Artifact[] = [];
  let text = content;
  const implicitLimit = options?.maxImplicit ?? Number.POSITIVE_INFINITY;
  let implicitCount = 0;

  const artifactTagRegex =
    /<artifact\s+type="([^"]+)"(?:\s+title="([^"]*)")?\s*>([\s\S]*?)<\/artifact>/g;
  let match: RegExpExecArray | null;

  while ((match = artifactTagRegex.exec(content)) !== null) {
    const type = match[1] as Artifact["type"];
    const title = match[2] || "";
    const code = match[3].trim();

    artifacts.push({
      id: `artifact-${artifacts.length}-${Date.now()}`,
      type,
      title,
      code,
    });

    text = text.replace(match[0], `[Artifact: ${title || type}]`);
  }

  const artifactCodeBlockRegex =
    /```artifact-(html|react|javascript|python|svg|mermaid)\s*\n([\s\S]*?)```/g;

  while ((match = artifactCodeBlockRegex.exec(content)) !== null) {
    const type = match[1] as Artifact["type"];
    const code = match[2].trim();

    artifacts.push({
      id: `artifact-${artifacts.length}-${Date.now()}`,
      type,
      title: "",
      code,
    });

    text = text.replace(match[0], `[Artifact: ${type}]`);
  }

  if (options?.includeImplicit) {
    const implicitCodeBlockRegex = /```(html|svg)\s*\n([\s\S]*?)```/g;
    while ((match = implicitCodeBlockRegex.exec(content)) !== null) {
      if (implicitCount >= implicitLimit) {
        continue;
      }
      const type = match[1] as Artifact["type"];
      const code = match[2].trim();

      artifacts.push({
        id: `artifact-${artifacts.length}-${Date.now()}`,
        type,
        title: "",
        code,
      });

      text = text.replace(match[0], `[Artifact: ${type}]`);
      implicitCount += 1;
    }
  }

  return { text, artifacts };
}
