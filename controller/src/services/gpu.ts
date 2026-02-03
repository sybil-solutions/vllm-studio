// CRITICAL
import { execSync, spawnSync } from "node:child_process";
import type { GpuInfo } from "../types/models";

export const detectGpuType = (): "nvidia" | "amd" | null => {
  try {
    const nvidiaSmi = process.env["NVIDIA_SMI_PATH"] || "nvidia-smi";
    execSync(`${nvidiaSmi} --query-gpu=name --format=csv,noheader,nounits`, {
      encoding: "utf-8",
      timeout: 5000,
      stdio: "pipe",
    });
    return "nvidia";
  } catch {
    // Ignore
  }

  try {
    spawnSync("rocm-smi", ["--showproductname"], {
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return "amd";
  } catch {
    return null;
  }
};

const parseRocmCsv = (output: string): Record<string, string>[] => {
  if (!output || output.trim().length === 0) {
    return [];
  }
  const lines = output.trim().split("\n");
  if (lines.length < 2) {
    return [];
  }
  const headers = lines[0].split(",").slice(1);
  return lines.slice(1).map((line) => {
    const values = line.split(",").slice(1);
    return headers.reduce((acc, header, index) => {
      acc[header] = values[index]?.trim() ?? "";
      return acc;
    }, {} as Record<string, string>);
  });
};

export const getAmdGpuInfo = (): GpuInfo[] => {
  try {
    const runRocm = (args: string[]): string => {
      const result = spawnSync("rocm-smi", args, {
        encoding: "utf-8",
        timeout: 5000,
        stdio: ["ignore", "pipe", "pipe"],
      });
      if (result.status !== 0 || !result.stdout) {
        return "";
      }
      return result.stdout.toString();
    };

    const [productOutput, memOutput, useOutput, tempOutput, powerOutput] = [
      runRocm(["--showproductname", "--csv"]),
      runRocm(["--showmeminfo", "vram", "--csv"]),
      runRocm(["--showuse", "--csv"]),
      runRocm(["-t", "--csv"]),
      runRocm(["--showpower", "--csv"]),
    ];

    const products = parseRocmCsv(productOutput);
    const mems = parseRocmCsv(memOutput);
    const uses = parseRocmCsv(useOutput);
    const temps = parseRocmCsv(tempOutput);
    const powers = parseRocmCsv(powerOutput);

    const gpuCount = Math.max(products.length, mems.length, uses.length, temps.length, powers.length);
    if (gpuCount === 0) {
      return [];
    }

    const gpus: GpuInfo[] = [];
    for (let i = 0; i < gpuCount; i += 1) {
      const product = products[i] ?? {};
      const mem = mems[i] ?? {};
      const use = uses[i] ?? {};
      const temp = temps[i] ?? {};
      const power = powers[i] ?? {};

      const name = product["Card Series"] || product["Device Name"] || "AMD GPU";
      const memTotal = Number(mem["VRAM Total Memory (B)"] ?? 0);
      const memUsed = Number(mem["VRAM Total Used Memory (B)"] ?? 0);
      const memFree = Math.max(0, memTotal - memUsed);
      const utilization = Number(use["GPU use (%)"] ?? 0);
      const temperature = Number(temp["Temperature (Sensor edge) (C)"] ?? 0);
      const powerDraw = Number(power["Average Graphics Package Power (W)"] ?? 0);
      const toMB = (bytes: number): number => Math.max(0, Math.round(bytes / 1024 / 1024));

      gpus.push({
        index: i,
        name,
        memory_total: memTotal,
        memory_total_mb: toMB(memTotal),
        memory_used: memUsed,
        memory_used_mb: toMB(memUsed),
        memory_free: memFree,
        memory_free_mb: toMB(memFree),
        utilization,
        utilization_pct: utilization,
        temperature,
        temp_c: temperature,
        power_draw: powerDraw,
        power_limit: 0,
      });
    }

    return gpus;
  } catch {
    return [];
  }
};

export const getNvidiaGpuInfo = (): GpuInfo[] => {
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
    const nvidiaSmi = process.env["NVIDIA_SMI_PATH"] || "/usr/bin/nvidia-smi";
    const output = execSync(
      `${nvidiaSmi} --query-gpu=${query} --format=csv,noheader,nounits`,
      {
        encoding: "utf-8",
        timeout: 5000,
        env: { ...process.env, PATH: `/usr/bin:/usr/local/bin:${process.env["PATH"] || ""}` },
      }
    ).trim();

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
      const toMB = (mib: string | undefined): number =>
        Math.max(0, Math.round(Number(mib ?? 0)));
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

export const getGpuInfo = (): GpuInfo[] => {
  const gpuType = detectGpuType();
  if (gpuType === "amd") {
    return getAmdGpuInfo();
  }
  if (gpuType === "nvidia") {
    return getNvidiaGpuInfo();
  }
  return [];
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
  tensorParallel = 1,
): number => {
  let memoryGb = modelSizeGb;

  if (quantization) {
    const quantLower = quantization.toLowerCase();
    if (quantLower.includes("int4") || quantLower.includes("4bit")) {
      memoryGb *= 0.25;
    } else if (quantLower.includes("int8") || quantLower.includes("8bit") || quantLower === "awq" || quantLower === "gptq") {
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
  tensorParallel = 1,
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
