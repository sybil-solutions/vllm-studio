// CRITICAL
import { getApiKey } from "../api-key";
import { getStoredBackendUrl } from "../backend-url";
import { delay } from "../async";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 1_000;

export const encodePathSegments = (path: string) =>
  path
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

function isRetryableError(error: unknown, status?: number): boolean {
  if (status && status >= 500) return true;
  if (status === 429) return true;
  if (status === 408) return true;
  if (error instanceof TypeError) return true;
  if (error instanceof Error && error.name === "AbortError") return false;
  return false;
}

export interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export interface ChatRunStreamEvent {
  event: string;
  data: Record<string, unknown>;
}

export type ApiCore = ReturnType<typeof createApiCore>;

export function createApiCore(params: { baseUrl: string; useProxy: boolean }) {
  const { baseUrl, useProxy } = params;

  const buildUrl = (endpoint: string): string => {
    const path = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
    return useProxy ? `${baseUrl}/${path}` : `${baseUrl}${endpoint}`;
  };

  const buildHeaders = (extraHeaders?: HeadersInit): Record<string, string> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    const storedBackendUrl = getStoredBackendUrl();
    if (useProxy && storedBackendUrl) {
      headers["X-Backend-Url"] = storedBackendUrl;
    }

    const storedKey = getApiKey();
    if (storedKey) {
      headers["Authorization"] = `Bearer ${storedKey}`;
    }

    if (extraHeaders) {
      const merged = new Headers(extraHeaders);
      merged.forEach((value, key) => {
        headers[key] = value;
      });
    }

    return headers;
  };

  const request = async <T>(endpoint: string, options: RequestOptions = {}): Promise<T> => {
    const {
      timeout = DEFAULT_TIMEOUT_MS,
      retries = DEFAULT_RETRIES,
      retryDelay = DEFAULT_RETRY_DELAY_MS,
      ...fetchOptions
    } = options;

    const headers = buildHeaders(fetchOptions.headers);
    const url = buildUrl(endpoint);

    let lastError: Error | null = null;
    let lastStatus: number | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          headers,
          credentials: "include",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        lastStatus = response.status;

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({ detail: "Request failed" }));
          const errorMessage =
            errorBody.detail || errorBody.error?.message || `HTTP ${response.status}`;
          lastError = new Error(errorMessage);

          if (isRetryableError(lastError, response.status) && attempt < retries) {
            const backoffMs = retryDelay * Math.pow(2, attempt);
            console.warn(
              `[API] Retry ${attempt + 1}/${retries} for ${endpoint} after ${backoffMs}ms (status: ${response.status})`,
            );
            await delay(backoffMs);
            continue;
          }

          throw lastError;
        }

        const text = await response.text();
        return text ? (JSON.parse(text) as T) : (null as unknown as T);
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === "AbortError") {
          lastError = new Error(`Request timeout after ${timeout}ms`);
        } else if (error instanceof Error) {
          lastError = error;
        } else {
          lastError = new Error(String(error));
        }

        if (isRetryableError(error, lastStatus) && attempt < retries) {
          const backoffMs = retryDelay * Math.pow(2, attempt);
          console.warn(
            `[API] Retry ${attempt + 1}/${retries} for ${endpoint} after ${backoffMs}ms (${lastError.message})`,
          );
          await delay(backoffMs);
          continue;
        }

        throw lastError;
      }
    }

    throw lastError || new Error("Request failed after retries");
  };

  const parseSseStream = async function* (
    reader: ReadableStreamDefaultReader<Uint8Array>,
  ): AsyncGenerator<ChatRunStreamEvent> {
    const decoder = new TextDecoder();
    let buffer = "";
    let eventType = "";
    let dataLines: string[] = [];

    const flushEvent = (): ChatRunStreamEvent | null => {
      if (dataLines.length === 0) return null;
      const dataString = dataLines.join("\n");
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(dataString) as Record<string, unknown>;
      } catch {
        data = { raw: dataString };
      }
      const payload = { event: eventType || "message", data };
      eventType = "";
      dataLines = [];
      return payload;
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line) {
          const payload = flushEvent();
          if (payload) yield payload;
          continue;
        }

        if (line.startsWith("event:")) {
          eventType = line.slice(6).trim();
          continue;
        }

        if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trim());
        }
      }
    }

    const finalPayload = flushEvent();
    if (finalPayload) yield finalPayload;
  };

  const postSseJson = async (
    endpoint: string,
    payload: unknown,
    options: { signal?: AbortSignal } = {},
  ): Promise<{ runId: string | null; stream: AsyncGenerator<ChatRunStreamEvent> }> => {
    const url = buildUrl(endpoint);
    const headers = buildHeaders({ Accept: "text/event-stream" });

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: options.signal,
      credentials: "include",
    });

    if (!response.ok || !response.body) {
      const errorBody = await response.json().catch(() => ({ detail: "Request failed" }));
      const errorMessage =
        errorBody.detail || errorBody.error?.message || `HTTP ${response.status}`;
      throw new Error(errorMessage);
    }

    const runId = response.headers.get("x-run-id");
    const reader = response.body.getReader();
    return { runId, stream: parseSseStream(reader) };
  };

  return {
    baseUrl,
    useProxy,
    buildUrl,
    buildHeaders,
    request,
    postSseJson,
  };
}
