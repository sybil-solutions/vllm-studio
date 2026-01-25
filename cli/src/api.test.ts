// CRITICAL
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchGPUs, fetchRecipes, fetchStatus, fetchConfig, fetchLifetimeMetrics } from './api';

// Mock fetch
global.fetch = vi.fn();

describe('API Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VLLM_STUDIO_URL = 'http://localhost:8080';
  });

  describe('fetchGPUs', () => {
    it('returns GPU array on success', async () => {
      const mockGPUs = [
        { index: 0, name: 'NVIDIA A100', memory_used: 10, memory_total: 40, utilization: 50 },
      ];

      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ gpus: mockGPUs }),
      });

      const gpus = await fetchGPUs();
      expect(gpus).toEqual(mockGPUs);
    });

    it('returns empty array on failure', async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

      const gpus = await fetchGPUs();
      expect(gpus).toEqual([]);
    });

    it('returns empty array when response not ok', async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
      });

      const gpus = await fetchGPUs();
      expect(gpus).toEqual([]);
    });
  });

  describe('fetchRecipes', () => {
    it('returns recipes array on success', async () => {
      const mockRecipes = [
        { id: 'llama-3-8b', name: 'Llama 3 8B', backend: 'vllm', model_path: '/models/llama' },
      ];

      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockRecipes,
      });

      const recipes = await fetchRecipes();
      expect(recipes).toEqual(mockRecipes);
    });

    it('returns empty array on failure', async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

      const recipes = await fetchRecipes();
      expect(recipes).toEqual([]);
    });
  });

  describe('fetchStatus', () => {
    it('returns status with running true', async () => {
      const mockStatus = {
        running: true,
        launching: false,
        process: { pid: 1234, backend: 'vllm', port: 8000 },
      };

      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus,
      });

      const status = await fetchStatus();
      expect(status.running).toBe(true);
      expect(status.backend).toBe('vllm');
      expect(status.pid).toBe(1234);
    });

    it('returns status with running false', async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ running: false, launching: false }),
      });

      const status = await fetchStatus();
      expect(status.running).toBe(false);
    });

    it('returns default status on failure', async () => {
      (global.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

      const status = await fetchStatus();
      expect(status.running).toBe(false);
    });
  });
});
