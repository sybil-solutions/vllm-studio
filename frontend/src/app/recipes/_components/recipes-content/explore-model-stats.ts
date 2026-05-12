import type { HuggingFaceModel, ModelRecommendation } from "@/lib/types";
import { estimateModelSizeMb, type QuantFormat } from "@/lib/vram-estimator";

export function modelRecencyMs(model: HuggingFaceModel): number {
  const raw = model.lastModified ?? model.createdAt;
  if (!raw) return 0;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : 0;
}

export function quantFromTags(tags: string[]): QuantFormat {
  const t = tags.map((x) => x.toLowerCase()).join("|");
  if (t.includes("q4_k_m") || t.includes("q4-k-m")) return "q4_k_m";
  if (t.includes("q5_k_m")) return "q5_k_m";
  if (t.includes("q8_0") || t.includes("q8-0")) return "q8_0";
  if (t.includes("q4_0") || t.includes("q4-0")) return "q4_0";
  if (t.includes("q3_k_m")) return "q3_k_m";
  if (t.includes("q2_k") || t.includes("q2-k")) return "q2_k";
  if (t.includes("iq3_m")) return "iq3_m";
  if (t.includes("iq2")) return "iq2";
  if (t.includes("fp8")) return "fp8";
  if (t.includes("int8")) return "int8";
  if (t.includes("int4") || t.includes("awq") || t.includes("gptq") || t.includes("w4a16"))
    return "int4";
  if (t.includes("gguf")) return "q4_k_m";
  if (t.includes("bf16")) return "bf16";
  return "bf16";
}

/**
 * Parse advertised parameter size (billions) from common HF repo naming patterns.
 */
export function parseParamsBillions(modelId: string): number | null {
  const s = modelId.replace(/[–—]/g, "-").toLowerCase();
  const matches = [...s.matchAll(/(\d+(?:\.\d+)?)\s*(b|m)\b/gi)];
  let best: number | null = null;
  for (const m of matches) {
    const n = parseFloat(m[1]);
    if (!Number.isFinite(n)) continue;
    const u = m[2].toLowerCase();
    const billions = u === "m" ? n / 1000 : n;
    if (billions >= 0.05 && billions <= 500) {
      if (best == null || billions > best) best = billions;
    }
  }
  if (best != null) return best;
  if (/\bgpt2\b/.test(s)) return 0.137;
  return null;
}

/** Rough weight footprint (GB) from name + quantization tags — for sorting and UI hints only. */
export function estimateRoughWeightsGb(model: HuggingFaceModel): number | null {
  const billions = parseParamsBillions(model.modelId);
  if (billions == null) return null;
  const params = billions * 1e9;
  const quant = quantFromTags(model.tags);
  const mb = estimateModelSizeMb(params, quant);
  return mb / 1024;
}

export function recommendedNeedGb(rec: ModelRecommendation): number | null {
  if (rec.min_vram_gb != null && rec.min_vram_gb > 0) return rec.min_vram_gb;
  if (rec.size_gb != null && rec.size_gb > 0) return rec.size_gb;
  return null;
}

export function resolveGroupNeedGb(
  key: string,
  recByKey: Map<string, ModelRecommendation>,
  lead: HuggingFaceModel,
): number | null {
  const rec = recByKey.get(key);
  if (rec) {
    const fromRec = recommendedNeedGb(rec);
    if (fromRec != null) return fromRec;
  }
  return estimateRoughWeightsGb(lead);
}
