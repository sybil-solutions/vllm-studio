import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { spawn, type ChildProcess } from "node:child_process";
import { join } from "node:path";
import type { Config } from "../../../controller/src/config/env";
import type { Logger } from "../../../controller/src/core/logger";
import { CRASH_LOOP_MAX_FAILURES } from "../../../controller/src/modules/engines/configs";
import { createEngineCoordinator } from "../../../controller/src/modules/engines/engine-coordinator";
import type { DownloadManager } from "../../../controller/src/modules/engines/downloads/download-manager";
import type { ProcessManager } from "../../../controller/src/modules/engines/process/process-manager";
import type { Recipe, LaunchResult } from "../../../controller/src/modules/models/types";
import type { RecipeStore } from "../../../controller/src/modules/models/recipes/recipe-store";
import { EventManager } from "../../../controller/src/modules/system/event-manager";
import { registerControllerTestLifecycle, tempDir } from "./fixtures";

registerControllerTestLifecycle();

const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

function makeRecipe(id: string): Recipe {
  return {
    id: id as Recipe["id"],
    name: id,
    model_path: join(tempDir, "models", id),
    backend: "vllm",
    env_vars: null,
    tensor_parallel_size: 1,
    pipeline_parallel_size: 1,
    max_model_len: 4096,
    gpu_memory_utilization: 0.9,
    kv_cache_dtype: "auto",
    max_num_seqs: 256,
    trust_remote_code: false,
    tool_call_parser: null,
    reasoning_parser: null,
    enable_auto_tool_choice: false,
    quantization: null,
    dtype: null,
    host: "127.0.0.1",
    port: 8000,
    served_model_name: null,
    python_path: null,
    extra_args: {},
    max_thinking_tokens: null,
    thinking_mode: "none",
  } as Recipe;
}

function makeConfig(inferencePort: number): Config {
  return {
    host: "127.0.0.1",
    port: 18080,
    inference_host: "127.0.0.1",
    inference_port: inferencePort,
    data_dir: tempDir,
    db_path: join(tempDir, "controller.db"),
    models_dir: join(tempDir, "models"),
    strict_openai_models: false,
    providers: [],
  };
}

function makeRecipeStore(recipes: Recipe[]): RecipeStore {
  return {
    list: () => recipes,
    get: (id: string) => recipes.find((recipe) => recipe.id === id) ?? null,
    save: (recipe: Recipe) => {
      const index = recipes.findIndex((existing) => existing.id === recipe.id);
      if (index >= 0) recipes[index] = recipe;
      else recipes.push(recipe);
    },
    delete: () => true,
    importFromJson: () => 0,
  } as unknown as RecipeStore;
}

function makeDownloadManager(): DownloadManager {
  return {
    start: async () => { throw new Error("not implemented"); },
    pause: () => { throw new Error("not implemented"); },
    resume: () => { throw new Error("not implemented"); },
    cancel: () => { throw new Error("not implemented"); },
    list: () => [],
    get: () => null,
  } as unknown as DownloadManager;
}

interface CoordinatorFixture {
  coordinator: ReturnType<typeof createEngineCoordinator>;
  processManager: ProcessManager;
  launchCallCount: () => number;
}

function createCoordinator({
  launchResult,
  recipes,
  inferencePort,
}: {
  launchResult: LaunchResult;
  recipes: Recipe[];
  inferencePort: number;
}): CoordinatorFixture {
  let calls = 0;
  const processManager: ProcessManager = {
    findInferenceProcess: async () => null,
    evictModel: async () => null,
    killProcess: async () => true,
    launchModel: async () => {
      calls += 1;
      return launchResult;
    },
  };

  const coordinator = createEngineCoordinator({
    config: makeConfig(inferencePort),
    logger: noopLogger,
    eventManager: new EventManager(),
    processManager,
    recipeStore: makeRecipeStore(recipes),
    downloadManager: makeDownloadManager(),
  });

  return { coordinator, processManager, launchCallCount: () => calls };
}

describe("EngineCoordinator crash-loop budget", () => {
  test("records launch failures and quarantines after the budget is exhausted", async () => {
    const recipe = makeRecipe("failing-recipe");
    const launchResult: LaunchResult = {
      success: false,
      pid: null,
      message: "mock launch failure",
      log_file: null,
    };
    const { coordinator, launchCallCount } = createCoordinator({
      launchResult,
      recipes: [recipe],
      inferencePort: 65534,
    });

    for (let index = 1; index < CRASH_LOOP_MAX_FAILURES; index += 1) {
      const result = await coordinator.setActiveRecipe(recipe);
      expect(result.ok).toBe(false);
      expect(coordinator.isQuarantined(recipe.id)).toBe(false);
      expect(launchCallCount()).toBe(index);
    }

    const finalResult = await coordinator.setActiveRecipe(recipe);
    expect(finalResult.ok).toBe(false);
    expect(coordinator.isQuarantined(recipe.id)).toBe(true);
    expect(launchCallCount()).toBe(CRASH_LOOP_MAX_FAILURES);
    expect(finalResult.quarantineInfo?.quarantined).toBe(true);
  });

  test("blocks further launches while the recipe is quarantined", async () => {
    const recipe = makeRecipe("blocked-recipe");
    const launchResult: LaunchResult = {
      success: false,
      pid: null,
      message: "mock launch failure",
      log_file: null,
    };
    const { coordinator, launchCallCount } = createCoordinator({
      launchResult,
      recipes: [recipe],
      inferencePort: 65534,
    });

    for (let index = 0; index < CRASH_LOOP_MAX_FAILURES; index += 1) {
      await coordinator.setActiveRecipe(recipe);
    }
    expect(coordinator.isQuarantined(recipe.id)).toBe(true);

    const blocked = await coordinator.setActiveRecipe(recipe);
    expect(blocked.ok).toBe(false);
    expect(blocked.error).toContain("quarantined");
    expect(launchCallCount()).toBe(CRASH_LOOP_MAX_FAILURES);
  });

  test("resetLaunchFailures clears the budget", async () => {
    const recipe = makeRecipe("reset-recipe");
    const launchResult: LaunchResult = {
      success: false,
      pid: null,
      message: "mock launch failure",
      log_file: null,
    };
    const { coordinator, launchCallCount } = createCoordinator({
      launchResult,
      recipes: [recipe],
      inferencePort: 65534,
    });

    for (let index = 0; index < CRASH_LOOP_MAX_FAILURES - 1; index += 1) {
      await coordinator.setActiveRecipe(recipe);
    }
    coordinator.resetLaunchFailures(recipe.id);

    for (let index = 0; index < CRASH_LOOP_MAX_FAILURES - 1; index += 1) {
      await coordinator.setActiveRecipe(recipe);
    }
    expect(coordinator.isQuarantined(recipe.id)).toBe(false);

    await coordinator.setActiveRecipe(recipe);
    expect(coordinator.isQuarantined(recipe.id)).toBe(true);
    expect(launchCallCount()).toBe(CRASH_LOOP_MAX_FAILURES * 2 - 1);
  });

  describe("with a live health endpoint", () => {
    let server: ReturnType<typeof Bun.serve>;
    let aliveChild: ChildProcess;

    beforeEach(() => {
      server = Bun.serve({
        port: 0,
        fetch: (request) => {
          if (new URL(request.url).pathname === "/health") {
            return new Response("OK", { status: 200 });
          }
          return new Response("Not Found", { status: 404 });
        },
      });
      aliveChild = spawn("sleep", ["60"]);
    });

    afterEach(() => {
      aliveChild.kill();
      server.stop();
    });

    test("a successful launch resets the failure budget", async () => {
      const recipe = makeRecipe("success-recipe");
      const failingResult: LaunchResult = {
        success: false,
        pid: null,
        message: "mock launch failure",
        log_file: null,
      };
      const successResult: LaunchResult = {
        success: true,
        pid: aliveChild.pid ?? null,
        message: "launched",
        log_file: null,
      };

      let nextResult = failingResult;
      const { coordinator } = createCoordinator({
        launchResult: {
          get success() { return nextResult.success; },
          get pid() { return nextResult.pid; },
          get message() { return nextResult.message; },
          get log_file() { return nextResult.log_file; },
        } as LaunchResult,
        recipes: [recipe],
        inferencePort: server.port,
      });

      for (let index = 0; index < CRASH_LOOP_MAX_FAILURES - 1; index += 1) {
        await coordinator.setActiveRecipe(recipe);
      }
      expect(coordinator.isQuarantined(recipe.id)).toBe(false);

      nextResult = successResult;
      const success = await coordinator.setActiveRecipe(recipe);
      expect(success.ok).toBe(true);
      expect(coordinator.isQuarantined(recipe.id)).toBe(false);

      nextResult = failingResult;
      for (let index = 0; index < CRASH_LOOP_MAX_FAILURES - 1; index += 1) {
        await coordinator.setActiveRecipe(recipe);
      }
      expect(coordinator.isQuarantined(recipe.id)).toBe(false);

      await coordinator.setActiveRecipe(recipe);
      expect(coordinator.isQuarantined(recipe.id)).toBe(true);
    });
  });

  test("records wait-for-ready failures and quarantines the recipe", async () => {
    const recipe = makeRecipe("crash-recipe");
    const quickExit = spawn("node", ["-e", "process.exit(1)"]);
    await new Promise((resolve) => setTimeout(resolve, 50));

    try {
      const launchResult: LaunchResult = {
        success: true,
        pid: quickExit.pid ?? null,
        message: "launched",
        log_file: null,
      };
      const { coordinator } = createCoordinator({
        launchResult,
        recipes: [recipe],
        inferencePort: 65534,
      });

      for (let index = 1; index <= CRASH_LOOP_MAX_FAILURES; index += 1) {
        const result = await coordinator.setActiveRecipe(recipe);
        expect(result.ok).toBe(false);
      }
      expect(coordinator.isQuarantined(recipe.id)).toBe(true);
    } finally {
      quickExit.kill();
    }
  });

  test("evicting a model is still allowed when the recipe is quarantined", async () => {
    const recipe = makeRecipe("evict-recipe");
    const launchResult: LaunchResult = {
      success: false,
      pid: null,
      message: "mock launch failure",
      log_file: null,
    };
    const { coordinator } = createCoordinator({
      launchResult,
      recipes: [recipe],
      inferencePort: 65534,
    });

    for (let index = 0; index < CRASH_LOOP_MAX_FAILURES; index += 1) {
      await coordinator.setActiveRecipe(recipe);
    }
    expect(coordinator.isQuarantined(recipe.id)).toBe(true);

    const evictResult = await coordinator.setActiveRecipe(null);
    expect(evictResult.ok).toBe(true);
  });

  test("ensureActive respects the quarantine and does not launch", async () => {
    const recipe = makeRecipe("ensure-blocked-recipe");
    const launchResult: LaunchResult = {
      success: false,
      pid: null,
      message: "mock launch failure",
      log_file: null,
    };
    const { coordinator, launchCallCount } = createCoordinator({
      launchResult,
      recipes: [recipe],
      inferencePort: 65534,
    });

    for (let index = 0; index < CRASH_LOOP_MAX_FAILURES; index += 1) {
      await coordinator.setActiveRecipe(recipe);
    }
    expect(coordinator.isQuarantined(recipe.id)).toBe(true);

    const result = await coordinator.ensureActive(recipe, { publish_events: false });
    expect(result.error).toContain("quarantined");
    expect(result.quarantineInfo?.quarantined).toBe(true);
    expect(launchCallCount()).toBe(CRASH_LOOP_MAX_FAILURES);
  });

  test("getQuarantinedRecipes returns only quarantined recipes", async () => {
    const recipeA = makeRecipe("recipe-a");
    const recipeB = makeRecipe("recipe-b");
    const launchResult: LaunchResult = {
      success: false,
      pid: null,
      message: "mock launch failure",
      log_file: null,
    };
    const { coordinator } = createCoordinator({
      launchResult,
      recipes: [recipeA, recipeB],
      inferencePort: 65534,
    });

    for (let index = 0; index < CRASH_LOOP_MAX_FAILURES; index += 1) {
      await coordinator.setActiveRecipe(recipeA);
    }

    const quarantined = coordinator.getQuarantinedRecipes();
    expect(quarantined).toHaveLength(1);
    expect(quarantined[0].recipe_id).toBe(recipeA.id);
    expect(quarantined[0].info.quarantined).toBe(true);
  });
});
