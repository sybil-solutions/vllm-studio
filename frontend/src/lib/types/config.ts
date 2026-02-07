// CRITICAL
/**
 * Controller/system configuration types.
 */

export interface ServiceInfo {
  name: string;
  port: number;
  internal_port: number;
  protocol: string;
  status: string;
  description: string | null;
}

export interface SystemConfig {
  host: string;
  port: number;
  inference_port: number;
  api_key_configured: boolean;
  models_dir: string;
  data_dir: string;
  db_path: string;
  sglang_python: string | null;
  tabby_api_dir: string | null;
  llama_bin: string | null;
}

export interface EnvironmentInfo {
  controller_url: string;
  inference_url: string;
  litellm_url: string;
  frontend_url: string;
}

export interface RuntimeBackendInfo {
  installed: boolean;
  version: string | null;
  python_path?: string | null;
  binary_path?: string | null;
}

export interface RuntimeCudaInfo {
  driver_version: string | null;
  cuda_version: string | null;
}

export interface RuntimeGpuInfoSummary {
  count: number;
  types: string[];
}

export interface SystemRuntimeInfo {
  cuda: RuntimeCudaInfo;
  gpus: RuntimeGpuInfoSummary;
  backends: {
    vllm: RuntimeBackendInfo;
    sglang: RuntimeBackendInfo;
    llamacpp: RuntimeBackendInfo;
  };
}

export interface ConfigData {
  config: SystemConfig;
  services: ServiceInfo[];
  environment: EnvironmentInfo;
  runtime: SystemRuntimeInfo;
}

export interface DeepResearchConfig {
  enabled: boolean;
  maxSources: number;
  searchDepth: "shallow" | "medium" | "deep";
  autoSummarize: boolean;
  includeCitations: boolean;
}

