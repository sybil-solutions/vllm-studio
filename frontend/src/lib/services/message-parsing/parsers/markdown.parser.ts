// CRITICAL
/**
 * Markdown Parser
 * Segments markdown content and renders to HTML
 * Uses markdown-it for HTML rendering
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const MarkdownIt = require("markdown-it");
import type { IMarkdownParser, MarkdownSegment } from "../types";

// Pattern for code fences
const CODE_FENCE_PATTERN = /```([^\s`]+)?\r?\n([\s\S]*?)```/g;

// Initialize markdown-it with appropriate settings
const markdownIt = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: false,
  typographer: false,
  highlight: (code: string) => code,
});

// Disable fence handling (we handle code blocks separately)
markdownIt.disable(["fence"]);

// Configure link rendering to open in new tabs
markdownIt.renderer.rules.link_open = (
  tokens: Array<{
    attrIndex: (name: string) => number;
    attrPush: (attr: [string, string]) => void;
    attrs?: Array<[string, string]>;
  }>,
  idx: number,
  options: Record<string, unknown>,
  _env: unknown,
  self: {
    renderToken: (tokens: unknown[], idx: number, options: Record<string, unknown>) => string;
  },
) => {
  const token = tokens[idx];
  const targetIndex = token.attrIndex("target");
  const relIndex = token.attrIndex("rel");

  if (targetIndex < 0) {
    token.attrPush(["target", "_blank"]);
  } else {
    token.attrs![targetIndex][1] = "_blank";
  }

  if (relIndex < 0) {
    token.attrPush(["rel", "noopener noreferrer"]);
  } else {
    token.attrs![relIndex][1] = "noopener noreferrer";
  }

  return self.renderToken(tokens, idx, options);
};

export class MarkdownParser implements IMarkdownParser {
  readonly name = "markdown" as const;

  parse(input: string): MarkdownSegment[] {
    if (!input) return [];

    const segments: MarkdownSegment[] = [];
    const fenceRegex = new RegExp(CODE_FENCE_PATTERN.source, "g");
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = fenceRegex.exec(input)) !== null) {
      // Add markdown segment before code block
      if (match.index > lastIndex) {
        const content = input.slice(lastIndex, match.index);
        if (content.trim()) {
          segments.push({ type: "markdown", content });
        }
      }

      // Add code segment
      const rawLang = (match[1] || "").trim();
      const language = rawLang.toLowerCase() === "mermaidgraph" ? "mermaid" : rawLang;
      const codeContent = match[2] || "";

      if (codeContent.trim()) {
        segments.push({
          type: "code",
          content: codeContent,
          language,
        });
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining markdown
    if (lastIndex < input.length) {
      const content = input.slice(lastIndex);
      if (content.trim()) {
        segments.push({ type: "markdown", content });
      }
    }

    return segments;
  }

  renderToHtml(markdown: string): string {
    if (!markdown) return "";
    return markdownIt.render(markdown);
  }
}

export const markdownParser = new MarkdownParser();
