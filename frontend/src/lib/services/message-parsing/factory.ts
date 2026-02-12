// CRITICAL
/**
 * Message Parsing Service Factory
 * Creates configured instances of MessageParsingService
 */

import { MessageParsingService } from "./service";
import { DEFAULT_CONFIG } from "./types";
import type {
  IMessageParsingService,
  IMessageParsingServiceFactory,
  MessageParsingConfig,
} from "./types";

// Singleton instance for default configuration
let defaultInstance: IMessageParsingService | null = null;

export class MessageParsingServiceFactory implements IMessageParsingServiceFactory {
  /**
   * Create a new service instance with custom configuration
   */
  create(config: Partial<MessageParsingConfig>): IMessageParsingService {
    const fullConfig: MessageParsingConfig = {
      ...DEFAULT_CONFIG,
      ...config,
    };
    return new MessageParsingService(fullConfig);
  }

  /**
   * Create or return the default service instance (singleton)
   */
  createDefault(): IMessageParsingService {
    if (!defaultInstance) {
      defaultInstance = new MessageParsingService(DEFAULT_CONFIG);
    }
    return defaultInstance;
  }
}

// Export singleton factory instance
export const messageParsingServiceFactory = new MessageParsingServiceFactory();
