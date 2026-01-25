// CRITICAL
import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { registerSystemRoutes } from './system';
import type { AppContext } from '../types/context';
import { RecipeStore } from '../stores/recipe-store';
import { ChatStore } from '../stores/chat-store';
import { MCPStore } from '../stores/mcp-store';
import { MetricsStore } from '../stores/metrics-store';
import { EventManager } from '../services/event-manager';
import { ProcessManager } from '../services/process-manager';
import { Config } from '../config/env';

describe('System Routes', () => {
  let app: Hono;
  let context: AppContext;

  beforeEach(() => {
    app = new Hono();
    const recipeStore = new RecipeStore(':memory:');
    const chatStore = new ChatStore(':memory:');
    const mcpStore = new MCPStore(':memory:');
    const metricsStore = new MetricsStore(':memory:');
    const eventManager = new EventManager();
    const processManager = new ProcessManager(eventManager);
    const config = new Config();

    context = { recipeStore, chatStore, mcpStore, metricsStore, eventManager, processManager, config };
    registerSystemRoutes(app, context);
  });

  describe('GET /health', () => {
    it('returns health status', async () => {
      const res = await app.request('/health');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toHaveProperty('status');
      expect(json).toHaveProperty('inference_ready');
    });
  });

  describe('GET /gpus', () => {
    it('returns GPU information', async () => {
      const res = await app.request('/gpus');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(Array.isArray(json.gpus)).toBe(true);
    });
  });

  describe('GET /config', () => {
    it('returns system configuration', async () => {
      const res = await app.request('/config');
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json).toHaveProperty('port');
      expect(json).toHaveProperty('inference_port');
    });
  });
});
