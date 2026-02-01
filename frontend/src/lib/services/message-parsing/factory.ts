// CRITICAL
/**
 * Message Parsing Service Factory
 * Creates configured instances of MessageParsingService
 */

import { MessageParsingService } from "./service";
import { DEFAULT_CONFIG, type IMessageParsingService, type MessageParsingConfig } from "./types";

let defaultInstance: IMessageParsingService | null = null;

export function createMessageParsingService(
  config: Partial<MessageParsingConfig> = {},
): IMessageParsingService {
  const fullConfig: MessageParsingConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };
  return new MessageParsingService(fullConfig);
}

export function getMessageParsingService(): IMessageParsingService {
  if (!defaultInstance) {
    defaultInstance = createMessageParsingService();
  }
  return defaultInstance;
}
