// CRITICAL
import { describe, expect, it } from "bun:test";
import { createToolCallStream, parseToolCallsFromContent } from "../services/tool-call-core";

const decodeSseJsonLines = (text: string): Array<Record<string, unknown>> => {
  const out: Array<Record<string, unknown>> = [];
  for (const line of text.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    const payload = line.slice(6).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      out.push(JSON.parse(payload) as Record<string, unknown>);
    } catch {
      // ignore
    }
  }
  return out;
};

const collectStream = async (stream: ReadableStream<Uint8Array>): Promise<string> => {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let output = "";
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    output += decoder.decode(result.value);
  }
  return output;
};

describe("tool-call-core", () => {
  it("parses tool calls from XML blocks", () => {
    const content = `<tool_call><function=weather><arguments>{"city":"Paris"}</arguments></tool_call>`;
    const calls = parseToolCallsFromContent(content);
    expect(calls.length).toBe(1);
    expect(calls[0]?.function.name).toBe("weather");
    expect(calls[0]?.function.arguments).toContain('"Paris"');
  });

  it("parses MCP tool calls into server__tool", () => {
    const content = `<use_mcp_tool>
<server_name>exa</server_name>
<tool_name>search</tool_name>
<arguments>{"q":"vllm"}</arguments>
</use_mcp_tool>`;
    const calls = parseToolCallsFromContent(content);
    expect(calls.length).toBe(1);
    expect(calls[0]?.function.name).toBe("exa__search");
  });

  it("injects tool_calls before [DONE] for streaming XML", async () => {
    const encoder = new TextEncoder();
    const source = new ReadableStream<Uint8Array>({
      start(controller): void {
        controller.enqueue(
          encoder.encode(
            'data: {"choices":[{"delta":{"content":"<tool_call><function=calc><arguments>{\\"x\\":1}</arguments></tool_call>"}}]}\n\n'
          )
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });
    const stream = createToolCallStream(source.getReader());
    const output = await collectStream(stream);
    expect(output).toContain('"tool_calls"');
    expect(output).toContain('"name":"calc"');
    expect(output).toContain("data: [DONE]");
  });

  it("extracts <think> blocks into reasoning_content for streaming", async () => {
    const encoder = new TextEncoder();
    const source = new ReadableStream<Uint8Array>({
      start(controller): void {
        controller.enqueue(
          encoder.encode(
            'data: {"choices":[{"delta":{"content":"<think>hello</think>Visible"}}]}\n\n'
          )
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    const stream = createToolCallStream(source.getReader());
    const output = await collectStream(stream);
    const events = decodeSseJsonLines(output);

    const deltas = events
      .map((event) => {
        const choices = event["choices"];
        if (!Array.isArray(choices)) return null;
        const first = choices[0] as Record<string, unknown> | undefined;
        const delta = first ? (first["delta"] as Record<string, unknown> | undefined) : undefined;
        return delta ?? null;
      })
      .filter(Boolean) as Array<Record<string, unknown>>;

    const joinedContent = deltas.map((d) => String(d["content"] ?? "")).join("");
    const joinedReasoning = deltas.map((d) => String(d["reasoning_content"] ?? "")).join("");

    expect(joinedContent).toBe("Visible");
    expect(joinedReasoning).toBe("hello");
    expect(output).not.toContain("<think>");
    expect(output).not.toContain("</think>");
  });

  it("handles minimax-style missing opening tag by treating leading prefix as reasoning until </think>", async () => {
    const encoder = new TextEncoder();
    const source = new ReadableStream<Uint8Array>({
      start(controller): void {
        controller.enqueue(
          encoder.encode(
            'data: {"choices":[{"delta":{"content":"I think this might work, let me try this</think> Done."}}]}\n\n'
          )
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    const stream = createToolCallStream(source.getReader());
    const output = await collectStream(stream);
    const events = decodeSseJsonLines(output);

    const deltas = events
      .map((event) => {
        const choices = event["choices"];
        if (!Array.isArray(choices)) return null;
        const first = choices[0] as Record<string, unknown> | undefined;
        const delta = first ? (first["delta"] as Record<string, unknown> | undefined) : undefined;
        return delta ?? null;
      })
      .filter(Boolean) as Array<Record<string, unknown>>;

    const joinedContent = deltas.map((d) => String(d["content"] ?? "")).join("");
    const joinedReasoning = deltas.map((d) => String(d["reasoning_content"] ?? "")).join("");

    expect(joinedReasoning).toContain("I think this might work");
    expect(joinedContent.trim()).toBe("Done.");
    expect(output).not.toContain("</think>");
  });
});
