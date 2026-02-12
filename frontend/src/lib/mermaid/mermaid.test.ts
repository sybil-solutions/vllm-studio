import { describe, expect, it } from "vitest";
import { looksLikeMermaidDiagram, sanitizeMermaidCode } from "./index";

describe("mermaid helpers", () => {
  it("detects supported mermaid diagram headers", () => {
    expect(looksLikeMermaidDiagram("graph TD\nA-->B")).toBe(true);
    expect(looksLikeMermaidDiagram("sequenceDiagram\nAlice->>Bob: hi")).toBe(true);
    expect(looksLikeMermaidDiagram("not-a-diagram")).toBe(false);
  });

  it("normalizes frequent markdown/label formatting issues", () => {
    const sanitized = sanitizeMermaidCode("graph TD\nA[hello (world)<br/>]");
    expect(sanitized).toContain('A["hello (world)<br>"]');
  });
});
