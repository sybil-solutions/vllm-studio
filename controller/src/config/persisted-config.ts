// CRITICAL
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export interface PersistedConfig {
  models_dir?: string;
}

export const getPersistedConfigPath = (dataDir: string): string => {
  return resolve(dataDir, "studio-settings.json");
};

export const loadPersistedConfig = (dataDir: string): PersistedConfig => {
  const path = getPersistedConfigPath(dataDir);
  if (!existsSync(path)) {
    return {};
  }
  try {
    const content = readFileSync(path, "utf-8");
    const parsed = JSON.parse(content) as PersistedConfig;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export const savePersistedConfig = (dataDir: string, updates: PersistedConfig): PersistedConfig => {
  const path = getPersistedConfigPath(dataDir);
  const current = loadPersistedConfig(dataDir);
  const next: PersistedConfig = {
    ...current,
    ...updates,
  };
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(path, JSON.stringify(next, null, 2));
  return next;
};
