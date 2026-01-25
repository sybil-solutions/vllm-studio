// CRITICAL
import { describe, it, expect, beforeEach } from 'vitest';
import { RecipeStore } from './recipe-store';
import type { Recipe } from '../types/models';

describe('RecipeStore', () => {
  let store: RecipeStore;

  beforeEach(() => {
    store = new RecipeStore(':memory:');
  });

  describe('save', () => {
    it('saves a new recipe', () => {
      const recipe: Recipe = {
        id: 'test-recipe',
        name: 'Test Recipe',
        model_path: '/models/test',
        backend: 'vllm',
        tensor_parallel_size: 1,
        max_model_len: 4096,
        gpu_memory_utilization: 0.9,
      };

      store.save(recipe);
      const found = store.get('test-recipe');

      expect(found).toBeDefined();
      expect(found?.id).toBe('test-recipe');
      expect(found?.name).toBe('Test Recipe');
    });

    it('updates existing recipe', () => {
      const recipe: Recipe = {
        id: 'test-recipe',
        name: 'Original Name',
        model_path: '/models/test',
        backend: 'vllm',
        tensor_parallel_size: 1,
      };

      store.save(recipe);

      const updated: Recipe = {
        ...recipe,
        name: 'Updated Name',
      };

      store.save(updated);
      const found = store.get('test-recipe');

      expect(found?.name).toBe('Updated Name');
    });
  });

  describe('list', () => {
    it('returns empty array initially', () => {
      const recipes = store.list();
      expect(recipes).toEqual([]);
    });

    it('returns all recipes', () => {
      const recipe1: Recipe = {
        id: 'recipe-1',
        name: 'Recipe 1',
        model_path: '/models/1',
        backend: 'vllm',
        tensor_parallel_size: 1,
      };

      const recipe2: Recipe = {
        id: 'recipe-2',
        name: 'Recipe 2',
        model_path: '/models/2',
        backend: 'sglang',
        tensor_parallel_size: 1,
      };

      store.save(recipe1);
      store.save(recipe2);

      const recipes = store.list();
      expect(recipes).toHaveLength(2);
    });
  });

  describe('get', () => {
    it('returns recipe by id', () => {
      const recipe: Recipe = {
        id: 'test-recipe',
        name: 'Test Recipe',
        model_path: '/models/test',
        backend: 'vllm',
        tensor_parallel_size: 1,
      };

      store.save(recipe);
      const found = store.get('test-recipe');

      expect(found).toBeDefined();
      expect(found?.id).toBe('test-recipe');
    });

    it('returns null for non-existent recipe', () => {
      const found = store.get('non-existent');
      expect(found).toBeNull();
    });
  });

  describe('delete', () => {
    it('deletes existing recipe', () => {
      const recipe: Recipe = {
        id: 'test-recipe',
        name: 'Test Recipe',
        model_path: '/models/test',
        backend: 'vllm',
        tensor_parallel_size: 1,
      };

      store.save(recipe);
      const deleted = store.delete('test-recipe');

      expect(deleted).toBe(true);
      expect(store.get('test-recipe')).toBeNull();
    });

    it('returns false for non-existent recipe', () => {
      const result = store.delete('non-existent');
      expect(result).toBe(false);
    });
  });
});
