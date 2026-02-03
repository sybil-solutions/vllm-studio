// CRITICAL
import type { Artifact } from "@/lib/types";

// Utility to extract artifacts from message content
export function extractArtifacts(
  content: string,
  options?: { includeImplicit?: boolean; maxImplicit?: number },
): { text: string; artifacts: Artifact[] } {
  const artifacts: Artifact[] = [];
  let text = content;
  const implicitLimit = options?.maxImplicit ?? Number.POSITIVE_INFINITY;
  let implicitCount = 0;

  // Pattern 1: <artifact type="html" title="...">...</artifact>
  const artifactTagRegex =
    /<artifact\s+type="([^"]+)"(?:\s+title="([^"]*)")?\s*>([\s\S]*?)<\/artifact>/g;
  let match;

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

    // Remove the artifact from text
    text = text.replace(match[0], `[Artifact: ${title || type}]`);
  }

  // Pattern 2: ```artifact-html ... ``` or ```artifact-react ... ```
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

  // Pattern 3: Regular HTML code blocks (```html) when artifacts mode is enabled
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
