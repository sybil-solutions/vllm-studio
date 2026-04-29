import { NextRequest } from "next/server";
import { piRuntimeManager } from "@/lib/agent/pi-runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TurnRequest = {
  sessionId?: string;
  modelId?: string;
  message?: string;
  cwd?: string;
};

function sse(controller: ReadableStreamDefaultController<Uint8Array>, payload: unknown) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
}

export async function POST(request: NextRequest) {
  let body: TurnRequest;
  try {
    body = (await request.json()) as TurnRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const modelId = typeof body.modelId === "string" ? body.modelId.trim() : "";
  const sessionId =
    typeof body.sessionId === "string" && body.sessionId.trim() ? body.sessionId.trim() : "default";
  const cwd = typeof body.cwd === "string" && body.cwd.trim() ? body.cwd.trim() : undefined;

  if (!message) return Response.json({ error: "message is required" }, { status: 400 });
  if (!modelId) return Response.json({ error: "modelId is required" }, { status: 400 });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const session = piRuntimeManager.getSession(sessionId);
        sse(controller, { type: "status", phase: "starting", sessionId, modelId, cwd });
        await session.ensureStarted(modelId, cwd);
        sse(controller, { type: "status", phase: "running", session: session.status });
        await session.prompt(message, (event) => {
          sse(controller, { type: "pi", event });
        });
        sse(controller, { type: "status", phase: "done" });
      } catch (error) {
        sse(controller, {
          type: "error",
          error: error instanceof Error ? error.message : "Pi agent turn failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
