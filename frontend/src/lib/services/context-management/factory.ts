/**
 * Context Management Service Factory
 */

import { ContextManagementService } from "./service";
import { DEFAULT_CONTEXT_CONFIG, type IContextManagementService, type ContextConfig } from "./types";

let defaultInstance: IContextManagementService | null = null;

export function createContextManagementService(
  config: Partial<ContextConfig> = {},
): IContextManagementService {
  const fullConfig: ContextConfig = {
    ...DEFAULT_CONTEXT_CONFIG,
    ...config,
  };
  return new ContextManagementService(fullConfig);
}

export function getContextManagementService(): IContextManagementService {
  if (!defaultInstance) {
    defaultInstance = createContextManagementService();
  }
  return defaultInstance;
}
