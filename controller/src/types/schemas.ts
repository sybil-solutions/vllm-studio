// CRITICAL
import { z } from "zod";

/**
 * GPU information.
 */
export const GPUSchema = z.object({
  index: z.number(),
  name: z.string(),
  memory_used: z.number(),
  memory_total: z.number(),
  utilization: z.number(),
  temperature: z.number().optional(),
  power_draw: z.number().optional(),
});

/**
 * Type: GPU info.
 */
export type GPU = z.infer<typeof GPUSchema>;

/**
 * Health check response.
 */
export const HealthResponseSchema = z.object({
  status: z.literal("ok"),
  version: z.string(),
  inference_ready: z.boolean(),
  backend_reachable: z.boolean(),
  running_model: z.string().nullable().optional(),
});

/**
 * Type: Health response.
 */
export type HealthResponse = z.infer<typeof HealthResponseSchema>;

/**
 * Process information.
 */
export const ProcessInfoSchema = z.object({
  pid: z.number(),
  backend: z.enum(["vllm", "sglang", "tabby"]),
  model_path: z.string(),
  served_model_name: z.string().optional(),
  port: z.number(),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
});

/**
 * Type: Process info.
 */
export type ProcessInfo = z.infer<typeof ProcessInfoSchema>;

/**
 * Status response.
 */
export const StatusResponseSchema = z.object({
  running: z.boolean(),
  process: ProcessInfoSchema.optional(),
  inference_port: z.number(),
  launching: z.string().nullable().optional(),
});

/**
 * Type: Status response.
 */
export type StatusResponse = z.infer<typeof StatusResponseSchema>;

/**
 * System config response.
 */
export const SystemConfigResponseSchema = z.object({
  port: z.number(),
  inference_port: z.number(),
  models_dir: z.string(),
  data_dir: z.string(),
  services: z.array(
    z.object({
      name: z.string(),
      port: z.number(),
      internal_port: z.number(),
      protocol: z.string(),
      status: z.string(),
      description: z.string().nullable().optional(),
    })
  ),
});

/**
 * Type: System config response.
 */
export type SystemConfigResponse = z.infer<typeof SystemConfigResponseSchema>;

/**
 * GPU list response.
 */
export const GPUListResponseSchema = z.object({
  count: z.number(),
  gpus: z.array(GPUSchema),
});

/**
 * Type: GPU list response.
 */
export type GPUListResponse = z.infer<typeof GPUListResponseSchema>;
