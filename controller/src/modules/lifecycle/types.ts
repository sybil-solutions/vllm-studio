import type { RecipeId } from "../../types/brand";
import type { Backend as SharedBackend, RecipeBase } from "../../../../shared/src";

/**
 * Supported inference backends.
 */
export type Backend = SharedBackend;

/**
 * Model launch configuration.
 */
export interface Recipe extends Omit<RecipeBase, "id"> {
  id: RecipeId;
}

/**
 * Running inference process info.
 */
export interface ProcessInfo {
  pid: number;
  backend: string;
  model_path: string | null;
  port: number;
  served_model_name: string | null;
}

/**
 * Result of launching a model.
 */
export interface LaunchResult {
  success: boolean;
  pid: number | null;
  message: string;
  log_file: string | null;
}

/**
 * Health check response payload.
 */
export interface HealthResponse {
  status: string;
  version: string;
  inference_ready: boolean;
  backend_reachable: boolean;
  running_model: string | null;
}

/**
 * GPU information payload.
 */
export interface GpuInfo {
  index: number;
  name: string;
  memory_total: number;
  memory_total_mb: number;
  memory_used: number;
  memory_used_mb: number;
  memory_free: number;
  memory_free_mb: number;
  utilization: number;
  utilization_pct: number;
  temperature: number;
  temp_c: number;
  power_draw: number;
  power_limit: number;
}

/**
 * Information about a service in the system topology.
 */
export interface ServiceInfo {
  name: string;
  port: number;
  internal_port: number;
  protocol: string;
  status: string;
  description?: string | null;
}

/**
 * System configuration settings.
 */
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

/**
 * Environment URLs and connection info.
 */
export interface EnvironmentInfo {
  controller_url: string;
  inference_url: string;
  litellm_url: string;
  frontend_url: string;
}

/**
 * Runtime backend version info.
 */
export interface RuntimeBackendInfo {
  installed: boolean;
  version: string | null;
  python_path?: string | null;
  binary_path?: string | null;
}

/**
 * CUDA runtime info.
 */
export interface RuntimeCudaInfo {
  driver_version: string | null;
  cuda_version: string | null;
}

/**
 * GPU summary info.
 */
export interface RuntimeGpuInfoSummary {
  count: number;
  types: string[];
}

/**
 * Runtime information for the system.
 */
export interface SystemRuntimeInfo {
  cuda: RuntimeCudaInfo;
  gpus: RuntimeGpuInfoSummary;
  backends: {
    vllm: RuntimeBackendInfo;
    sglang: RuntimeBackendInfo;
    llamacpp: RuntimeBackendInfo;
  };
}

/**
 * Full configuration response payload.
 */
export interface SystemConfigResponse {
  config: SystemConfig;
  services: ServiceInfo[];
  environment: EnvironmentInfo;
  runtime: SystemRuntimeInfo;
}
