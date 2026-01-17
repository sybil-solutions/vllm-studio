/**
 * Services Module
 *
 * Centralized service layer for the application.
 * Services follow standard patterns:
 * - Factory pattern for configuration
 * - Dependency injection via React context
 * - Strategy pattern for composable operations
 */

// Shared infrastructure
export { LRUCache, hashString } from './types';
export type {
  IParser,
  IValidatingParser,
  IService,
  ICacheableService,
  IServiceFactory,
} from './types';

// Message Parsing Service
export * from './message-parsing';

// Context Management Service
export * from './context-management';
