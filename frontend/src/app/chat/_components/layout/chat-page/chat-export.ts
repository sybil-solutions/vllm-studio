// CRITICAL

import type { ChatMessage } from "@/lib/types";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportChatAsJson(payload: {
  title: string;
  sessionId: string | null;
  model: string;
  messages: ChatMessage[];
}) {
  const data = {
    title: payload.title,
    sessionId: payload.sessionId,
    model: payload.model,
    messages: payload.messages.map((m) => ({
      id: m.id,
      role: m.role,
      parts: m.parts,
    })),
    exportedAt: new Date().toISOString(),
  };

  downloadBlob(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    `chat-${payload.sessionId || "export"}.json`,
  );
}

export function exportChatAsMarkdown(payload: {
  title: string;
  sessionId: string | null;
  model: string;
  messages: ChatMessage[];
}) {
  let md = `# ${payload.title}\n\n`;
  md += `Model: ${payload.model}\n`;
  md += `Exported: ${new Date().toLocaleString()}\n\n---\n\n`;

  for (const msg of payload.messages) {
    const role = msg.role === "user" ? "**User**" : "**Assistant**";
    md += `${role}:\n\n`;
    for (const part of msg.parts) {
      if (part.type === "text") {
        md += `${part.text}\n\n`;
        continue;
      }
      if (part.type.startsWith("tool-") && "toolCallId" in part) {
        md += `> Tool: ${part.type.replace(/^tool-/, "")}\n\n`;
      }
    }
    md += "---\n\n";
  }

  downloadBlob(
    new Blob([md], { type: "text/markdown" }),
    `chat-${payload.sessionId || "export"}.md`,
  );
}

