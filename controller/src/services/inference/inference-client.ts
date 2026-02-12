// CRITICAL
import type { AppContext } from "../../types/context";
import { buildLocalUrl, fetchLocal, type LocalFetchOptions } from "../../http/local-fetch";

export const buildInferenceUrl = (context: AppContext, path: string): string =>
  buildLocalUrl(context.config.inference_port, path);

export const fetchInference = (context: AppContext, path: string, options: LocalFetchOptions = {}): Promise<Response> =>
  fetchLocal(context.config.inference_port, path, options);

