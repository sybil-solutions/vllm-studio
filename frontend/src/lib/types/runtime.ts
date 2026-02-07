export interface VllmRuntimeInfo {
  installed: boolean;
  version: string | null;
  python_path: string | null;
  vllm_bin: string | null;
  bundled_wheel: {
    path: string;
    version: string | null;
  } | null;
}

export interface VllmRuntimeConfig {
  config: string | null;
  error?: string | null;
}

export interface VllmUpgradeResult {
  success: boolean;
  version: string | null;
  output: string | null;
  error: string | null;
  used_wheel: string | null;
}

