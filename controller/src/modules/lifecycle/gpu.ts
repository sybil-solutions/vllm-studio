// CRITICAL
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { GpuInfo } from "./types";
import { resolveBinary, runCommand } from "../../core/command";

const resolveNvidiaSmiBinary = (): string | null => {
  const configured = process.env["NVIDIA_SMI_PATH"] || "nvidia-smi";
  const resolved = resolveBinary(configured);
  if (resolved) return resolved;
  if (configured.includes("/")) {
    const abs = resolve(configured);
    return existsSync(abs) ? abs : null;
  }
  return null;
};

/**
 * Query GPU info from nvidia-smi.
 * @returns List of GPU info objects.
 */
export const getGpuInfo = (): GpuInfo[] => {
  const query = [
    "name",
    "memory.total",
    "memory.used",
    "memory.free",
    "utilization.gpu",
    "temperature.gpu",
    "power.draw",
    "power.limit",
  ].join(",");

  try {
    const nvidiaSmi = resolveNvidiaSmiBinary();
    if (!nvidiaSmi) return [];

    const result = runCommand(
      nvidiaSmi,
      [`--query-gpu=${query}`, "--format=csv,noheader,nounits"],
      5_000
    );
    if (result.status !== 0 || !result.stdout) return [];

    const output = result.stdout.trim();

    if (!output) {
      return [];
    }

    const lines = output.split("\n");
    return lines.map((line, index) => {
      const parts = line.split(",").map((value) => value.trim());
      const [
        name,
        memoryTotal,
        memoryUsed,
        memoryFree,
        utilization,
        temperature,
        powerDraw,
        powerLimit,
      ] = parts;
      const toBytes = (megabytes: string | undefined): number =>
        Math.max(0, Math.round(Number(megabytes ?? 0) * 1024 * 1024));
      const toMB = (mib: string | undefined): number => Math.max(0, Math.round(Number(mib ?? 0)));
      return {
        index,
        name: name ?? "Unknown",
        memory_total: toBytes(memoryTotal),
        memory_total_mb: toMB(memoryTotal),
        memory_used: toBytes(memoryUsed),
        memory_used_mb: toMB(memoryUsed),
        memory_free: toBytes(memoryFree),
        memory_free_mb: toMB(memoryFree),
        utilization: Number(utilization ?? 0),
        utilization_pct: Number(utilization ?? 0),
        temperature: Number(temperature ?? 0),
        temp_c: Number(temperature ?? 0),
        power_draw: Number(powerDraw ?? 0),
        power_limit: Number(powerLimit ?? 0),
      };
    });
  } catch {
    return [];
  }
};

/**
 * Estimate VRAM needed for a model in GB.
 * @param modelSizeGb - Base model size in GB.
 * @param quantization - Quantization method.
 * @param dtype - Data type.
 * @param tensorParallel - Number of GPUs for tensor parallelism.
 * @returns Estimated VRAM needed per GPU in GB.
 */
export const estimateModelMemory = (
  modelSizeGb: number,
  quantization?: string,
  dtype?: string,
  tensorParallel = 1
): number => {
  let memoryGb = modelSizeGb;

  if (quantization) {
    const quantLower = quantization.toLowerCase();
    if (quantLower.includes("int4") || quantLower.includes("4bit")) {
      memoryGb *= 0.25;
    } else if (
      quantLower.includes("int8") ||
      quantLower.includes("8bit") ||
      quantLower === "awq" ||
      quantLower === "gptq"
    ) {
      memoryGb *= 0.5;
    } else if (quantLower.includes("fp8")) {
      memoryGb *= 0.5;
    }
  }

  if (dtype) {
    const dtypeLower = dtype.toLowerCase();
    if (dtypeLower.includes("float32") || dtypeLower.includes("fp32")) {
      memoryGb *= 2.0;
    } else if (dtypeLower.includes("int8")) {
      memoryGb *= 0.5;
    }
  }

  if (tensorParallel > 1) {
    memoryGb /= tensorParallel;
  }

  memoryGb *= 1.3;
  return memoryGb;
};

/**
 * Check if a model can fit on available GPUs.
 * @param modelSizeGb - Base model size in GB.
 * @param quantization - Quantization method.
 * @param dtype - Data type.
 * @param tensorParallel - Number of GPUs.
 * @returns True if the model can fit on GPUs.
 */
export const canFitModel = (
  modelSizeGb: number,
  quantization?: string,
  dtype?: string,
  tensorParallel = 1
): boolean => {
  const gpus = getGpuInfo();
  if (gpus.length === 0) {
    return true;
  }
  const requiredGb = estimateModelMemory(modelSizeGb, quantization, dtype, tensorParallel);
  const requiredBytes = requiredGb * 1024 ** 3;
  if (gpus.length < tensorParallel) {
    return false;
  }
  for (let index = 0; index < tensorParallel; index += 1) {
    const gpu = gpus[index];
    if (!gpu || gpu.memory_free < requiredBytes) {
      return false;
    }
  }
  return true;
};
