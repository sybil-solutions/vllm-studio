/**
 * Shared service infrastructure types
 * These types establish patterns for all service modules in the application
 */

/**
 * Base parser interface using Strategy pattern
 * Each parser is a composable unit that transforms input to output
 */
export interface IParser<TInput, TOutput> {
  readonly name: string;
  parse(input: TInput): TOutput;
  canParse?(input: TInput): boolean;
}

/**
 * Parser with validation capability
 */
export interface IValidatingParser<TInput, TOutput> extends IParser<TInput, TOutput> {
  validate(input: TInput): boolean;
}

/**
 * Base service interface with lifecycle methods
 */
export interface IService {
  readonly name: string;
  initialize?(): void | Promise<void>;
  dispose?(): void | Promise<void>;
}

/**
 * Service with caching capability
 */
export interface ICacheableService<TKey, TValue> extends IService {
  getCached(key: TKey): TValue | null;
  invalidateCache(key?: TKey): void;
  readonly cacheSize: number;
}

/**
 * Factory interface for creating configured service instances
 */
export interface IServiceFactory<TConfig, TService> {
  create(config: TConfig): TService;
  createDefault(): TService;
}

/**
 * LRU Cache implementation for services
 */
export class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private readonly maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  get(key: K): V | null {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return null;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove oldest (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

/**
 * Simple hash function for cache keys
 */
export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}
