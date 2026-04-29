import { EventEmitter } from "node:events";
import { existsSync } from "node:fs";
import { chmod, mkdir, realpath, stat, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { getApiSettings, type ApiSettings } from "@/lib/api-settings";
import { normalizeOpenAIModels, modelsToPiModels, type AgentModel } from "./models";

const PROVIDER_ID = "vllm-studio";
const DEFAULT_SESSION_ID = "default";

type PiResponse = {
  id?: string;
  type: "response";
  command?: string;
  success?: boolean;
  data?: unknown;
  error?: string | { message?: string };
};

type PiEvent = Record<string, unknown> & { type?: string };

type PendingCommand = {
  resolve: (response: PiResponse) => void;
  reject: (error: Error) => void;
};

function normalizeBackendUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function getWritableDataDir(): string {
  const candidates = [
    process.env.VLLM_STUDIO_DATA_DIR,
    path.join(process.cwd(), "data"),
    path.join(process.cwd(), "..", "data"),
    path.join(process.cwd(), "frontend", "data"),
    path.join(homedir(), ".vllm-studio"),
    path.join(tmpdir(), "vllm-studio"),
  ].filter((dir): dir is string => Boolean(dir));

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return candidates[0] ?? path.join(tmpdir(), "vllm-studio");
}

function resolveDefaultAgentCwd(): string {
  if (process.env.VLLM_STUDIO_AGENT_CWD) return process.env.VLLM_STUDIO_AGENT_CWD;
  const cwd = process.cwd();
  if (path.basename(cwd) === "frontend") return path.resolve(cwd, "..");
  return cwd;
}

function expandHome(value: string): string {
  if (value === "~") return homedir();
  if (value.startsWith(`~${path.sep}`)) return path.join(homedir(), value.slice(2));
  return value;
}

async function resolveAgentCwd(input?: string): Promise<string> {
  const defaultCwd = resolveDefaultAgentCwd();
  const raw = input?.trim() || defaultCwd;
  const expanded = expandHome(raw);
  const candidate = path.isAbsolute(expanded) ? expanded : path.resolve(defaultCwd, expanded);
  const resolved = await realpath(candidate);
  const info = await stat(resolved);
  if (!info.isDirectory()) {
    throw new Error(`Agent cwd is not a directory: ${resolved}`);
  }
  return resolved;
}

function piBinaryPath(): string {
  const local = path.join(
    process.cwd(),
    "node_modules",
    ".bin",
    process.platform === "win32" ? "pi.cmd" : "pi",
  );
  if (existsSync(local)) return local;
  return "pi";
}

function piPathEnv(): string {
  const additions = ["/opt/homebrew/bin", path.join(homedir(), ".bun", "bin")];
  return [...additions, process.env.PATH ?? ""].filter(Boolean).join(path.delimiter);
}

async function fetchModelsFromBackend(settings: ApiSettings): Promise<AgentModel[]> {
  const backendUrl = normalizeBackendUrl(settings.backendUrl);
  const headers: HeadersInit = { Accept: "application/json" };
  if (settings.apiKey) headers.Authorization = `Bearer ${settings.apiKey}`;
  const response = await fetch(`${backendUrl}/v1/models`, { headers, cache: "no-store" });
  if (!response.ok) {
    throw new Error(`/v1/models failed with HTTP ${response.status}`);
  }
  const payload = (await response.json()) as unknown;
  return normalizeOpenAIModels(payload && typeof payload === "object" ? payload : {});
}

async function writePiModelsConfig(settings: ApiSettings, models: AgentModel[]): Promise<string> {
  const dataDir = getWritableDataDir();
  const agentDir = path.join(dataDir, "pi-agent");
  await mkdir(agentDir, { recursive: true });
  await chmod(agentDir, 0o700).catch(() => undefined);

  const backendUrl = normalizeBackendUrl(settings.backendUrl);
  const config = {
    providers: {
      [PROVIDER_ID]: {
        baseUrl: `${backendUrl}/v1`,
        api: "openai-completions",
        apiKey: settings.apiKey || "vllm-studio",
        authHeader: Boolean(settings.apiKey),
        compat: {
          supportsDeveloperRole: false,
          supportsReasoningEffort: false,
        },
        models: modelsToPiModels(models),
      },
    },
  };

  const modelsPath = path.join(agentDir, "models.json");
  await writeFile(modelsPath, JSON.stringify(config, null, 2), "utf-8");
  await chmod(modelsPath, 0o600).catch(() => undefined);
  return agentDir;
}

export async function refreshPiModels(): Promise<{ models: AgentModel[]; agentDir: string }> {
  const settings = await getApiSettings();
  const models = await fetchModelsFromBackend(settings);
  const agentDir = await writePiModelsConfig(settings, models);
  return { models, agentDir };
}

class PiRpcSession extends EventEmitter {
  private process: ChildProcessWithoutNullStreams | null = null;
  private buffer = "";
  private commandSeq = 0;
  private pending = new Map<string, PendingCommand>();
  private starting: Promise<void> | null = null;
  private currentModelId = "";
  private currentCwd = "";
  private agentDir = "";

  async ensureStarted(modelId: string, cwd?: string): Promise<void> {
    const resolvedCwd = await resolveAgentCwd(cwd);
    if (
      this.process &&
      !this.process.killed &&
      this.currentModelId === modelId &&
      this.currentCwd === resolvedCwd
    ) {
      return;
    }
    if (this.starting) await this.starting;
    if (
      this.process &&
      !this.process.killed &&
      this.currentModelId === modelId &&
      this.currentCwd === resolvedCwd
    ) {
      return;
    }

    this.starting = this.start(modelId, resolvedCwd).finally(() => {
      this.starting = null;
    });
    await this.starting;
  }

  private async start(modelId: string, cwd: string): Promise<void> {
    await this.stop();
    const { models, agentDir } = await refreshPiModels();
    const selectedModel = models.find((model) => model.id === modelId);
    if (!selectedModel) {
      throw new Error(`Model '${modelId}' is not available from /v1/models.`);
    }
    this.agentDir = agentDir;
    this.currentModelId = modelId;
    this.currentCwd = cwd;

    const args = [
      "--mode",
      "rpc",
      "--provider",
      PROVIDER_ID,
      "--model",
      `${PROVIDER_ID}/${modelId}`,
    ];
    if (selectedModel.reasoning) {
      args.push("--thinking", "high");
    }

    const child = spawn(piBinaryPath(), args, {
      cwd,
      env: {
        ...process.env,
        PATH: piPathEnv(),
        PI_CODING_AGENT_DIR: agentDir,
        PI_SKIP_VERSION_CHECK: "1",
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.process = child;
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => this.handleStdout(chunk));
    child.stderr.on("data", (chunk: string) => {
      this.emit("event", { type: "stderr", text: chunk });
    });
    child.on("exit", (code, signal) => {
      this.emit("event", { type: "process_exit", code, signal });
      for (const pending of this.pending.values()) {
        pending.reject(new Error(`pi rpc exited before response (code=${code}, signal=${signal})`));
      }
      this.pending.clear();
      if (this.process === child) this.process = null;
    });

    // Give the process one tick to fail early if the binary is missing.
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(resolve, 150);
      child.once("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private handleStdout(chunk: string) {
    this.buffer += chunk;
    let newline = this.buffer.indexOf("\n");
    while (newline !== -1) {
      const raw = this.buffer.slice(0, newline).replace(/\r$/, "");
      this.buffer = this.buffer.slice(newline + 1);
      if (raw.trim()) this.handleLine(raw);
      newline = this.buffer.indexOf("\n");
    }
  }

  private handleLine(raw: string) {
    let parsed: PiResponse | PiEvent;
    try {
      parsed = JSON.parse(raw) as PiResponse | PiEvent;
    } catch {
      this.emit("event", { type: "stdout", text: raw });
      return;
    }

    if (parsed.type === "response") {
      const response = parsed as PiResponse;
      const id = response.id;
      if (id && this.pending.has(id)) {
        const pending = this.pending.get(id);
        this.pending.delete(id);
        if (response.success === false) {
          const message =
            typeof response.error === "string"
              ? response.error
              : response.error?.message || `pi rpc command '${response.command ?? id}' failed`;
          pending?.reject(new Error(message));
        } else {
          pending?.resolve(response);
        }
        return;
      }
    }

    this.emit("event", parsed);
  }

  private sendCommand(command: Record<string, unknown>): Promise<PiResponse> {
    if (!this.process || this.process.killed) {
      return Promise.reject(new Error("pi rpc session is not running"));
    }
    const id = `cmd-${++this.commandSeq}`;
    const payload = { id, ...command };
    const line = `${JSON.stringify(payload)}\n`;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.process?.stdin.write(line, (error) => {
        if (error) {
          this.pending.delete(id);
          reject(error);
        }
      });
    });
  }

  async prompt(message: string, onEvent: (event: PiEvent) => void): Promise<void> {
    const listener = (event: PiEvent) => onEvent(event);
    this.on("event", listener);
    try {
      await this.sendCommand({ type: "prompt", message });
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error("Timed out waiting for pi agent completion")),
          30 * 60_000,
        );
        const done = (event: PiEvent) => {
          if (event.type === "agent_end") {
            clearTimeout(timeout);
            this.off("event", done);
            resolve();
          }
          if (event.type === "process_exit") {
            clearTimeout(timeout);
            this.off("event", done);
            reject(new Error("pi rpc process exited during turn"));
          }
        };
        this.on("event", done);
      });
    } finally {
      this.off("event", listener);
    }
  }

  async abort(): Promise<void> {
    if (!this.process || this.process.killed) return;
    await this.sendCommand({ type: "abort" }).catch(() => undefined);
  }

  async stop(): Promise<void> {
    if (!this.process) return;
    const child = this.process;
    this.process = null;
    child.kill("SIGTERM");
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 500);
      child.once("exit", () => {
        clearTimeout(timeout);
        resolve();
      });
    });
    if (!child.killed) child.kill("SIGKILL");
  }

  get status() {
    return {
      running: Boolean(this.process && !this.process.killed),
      modelId: this.currentModelId,
      cwd: this.currentCwd,
      agentDir: this.agentDir,
    };
  }
}

class PiRuntimeManager {
  private sessions = new Map<string, PiRpcSession>();

  getSession(sessionId = DEFAULT_SESSION_ID): PiRpcSession {
    const existing = this.sessions.get(sessionId);
    if (existing) return existing;
    const created = new PiRpcSession();
    this.sessions.set(sessionId, created);
    return created;
  }
}

const globalForPi = globalThis as typeof globalThis & { __vllmStudioPiRuntime?: PiRuntimeManager };

export const piRuntimeManager = globalForPi.__vllmStudioPiRuntime ?? new PiRuntimeManager();
globalForPi.__vllmStudioPiRuntime = piRuntimeManager;
