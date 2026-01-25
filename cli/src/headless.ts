import * as api from './api';

const COMMANDS: Record<string, () => Promise<void>> = {
  status: async () => console.log(JSON.stringify(await api.fetchStatus(), null, 2)),
  gpus: async () => console.log(JSON.stringify(await api.fetchGPUs(), null, 2)),
  recipes: async () => console.log(JSON.stringify(await api.fetchRecipes(), null, 2)),
  config: async () => console.log(JSON.stringify(await api.fetchConfig(), null, 2)),
  metrics: async () => console.log(JSON.stringify(await api.fetchLifetimeMetrics(), null, 2)),
  evict: async () => {
    const ok = await api.evictModel();
    console.log(JSON.stringify({ success: ok }));
    process.exit(ok ? 0 : 1);
  },
  launch: async () => {
    const id = process.argv[3];
    if (!id) { console.error('Usage: vllm-studio launch <recipe-id>'); process.exit(1); }
    const ok = await api.launchRecipe(id);
    console.log(JSON.stringify({ success: ok, recipe_id: id }));
    process.exit(ok ? 0 : 1);
  },
  help: async () => {
    console.log(`vllm-studio - Model lifecycle management CLI

Commands:
  status    Show current model status
  gpus      List GPUs with memory/utilization
  recipes   List available model recipes
  config    Show system configuration
  metrics   Show lifetime metrics
  launch    Launch recipe: vllm-studio launch <id>
  evict     Stop running model
  help      Show this help

Environment:
  VLLM_STUDIO_URL  Controller URL (default: http://localhost:8080)

Run without arguments for interactive TUI mode.`);
  },
};

export async function runHeadless(): Promise<void> {
  const cmd = process.argv[2] || 'help';
  const handler = COMMANDS[cmd];
  if (!handler) {
    console.error(`Unknown command: ${cmd}\nRun 'vllm-studio help' for usage.`);
    process.exit(1);
  }
  await handler();
}
