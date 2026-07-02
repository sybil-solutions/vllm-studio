import { describe, expect, test } from "bun:test";

import { classifyLaunchFailure } from "../../../controller/src/modules/engines/process/launch-failure-classifier";

describe("classifyLaunchFailure", () => {
  test("classifies missing binary", () => {
    expect(classifyLaunchFailure("Invalid llama_bin: executable \"/bin/foo\" was not found")).toBe(
      "binary_missing",
    );
    expect(classifyLaunchFailure("spawn error", { spawnError: "ENOENT" })).toBe("binary_missing");
    expect(classifyLaunchFailure("command not found: llamacpp")).toBe("binary_missing");
    expect(classifyLaunchFailure("No such file or directory", { spawnError: "enoent" })).toBe(
      "binary_missing",
    );
  });

  test("classifies non-executable binary", () => {
    expect(classifyLaunchFailure("spawn error", { spawnError: "EACCES" })).toBe(
      "binary_not_executable",
    );
    expect(classifyLaunchFailure("Permission denied")).toBe("binary_not_executable");
    expect(classifyLaunchFailure("spawn error", { spawnError: "access denied" })).toBe(
      "binary_not_executable",
    );
  });

  test("classifies port in use", () => {
    expect(classifyLaunchFailure("spawn error", { spawnError: "EADDRINUSE" })).toBe("port_in_use");
    expect(classifyLaunchFailure("Address already in use")).toBe("port_in_use");
  });

  test("classifies unsupported backend flag / invalid command", () => {
    expect(classifyLaunchFailure("Invalid launch command")).toBe("unsupported_backend_flag");
    expect(
      classifyLaunchFailure("Invalid llama_bin: only llama-server executables are allowed"),
    ).toBe("unsupported_backend_flag");
    expect(classifyLaunchFailure("Path traversal is not allowed: ../foo")).toBe(
      "unsupported_backend_flag",
    );
  });

  test("classifies process exited early", () => {
    expect(classifyLaunchFailure("Process exited early")).toBe("process_exited_early");
    expect(
      classifyLaunchFailure("Model abc crashed during startup: CUDA error", {
        logTail: "CUDA error",
      }),
    ).toBe("process_exited_early");
  });

  test("classifies health timeout", () => {
    expect(
      classifyLaunchFailure("Model abc failed to become ready (timeout)"),
    ).toBe("health_timeout");
  });

  test("classifies model file issues from log tail", () => {
    expect(
      classifyLaunchFailure("Model abc crashed during startup", {
        logTail: "OSError: file does not exist: /models/foo.gguf",
      }),
    ).toBe("model_file_missing");
    expect(
      classifyLaunchFailure("Model abc crashed during startup", {
        logTail: "Permission denied: /models/foo.gguf",
      }),
    ).toBe("model_file_unreadable");
    expect(
      classifyLaunchFailure("Model abc crashed during startup", {
        logTail: "RuntimeError: weights file appears to be truncated",
      }),
    ).toBe("model_file_corrupt_or_truncated");
  });

  test("classifies memory / capacity issues from log tail", () => {
    expect(
      classifyLaunchFailure("Model abc crashed during startup", {
        logTail: "torch.OutOfMemoryError: CUDA out of memory",
      }),
    ).toBe("vram_oom");
    expect(
      classifyLaunchFailure("Model abc crashed during startup", {
        logTail: "Killed process 1234",
      }),
    ).toBe("system_ram_oom_or_swap");
    expect(
      classifyLaunchFailure("Model abc crashed during startup", {
        logTail: "ValueError: max_model_len (32768) is too large for model",
      }),
    ).toBe("context_exceeds_runtime_capacity");
    expect(
      classifyLaunchFailure("Model abc crashed during startup", {
        logTail: "RuntimeError: KV cache capacity too small",
      }),
    ).toBe("kv_cache_capacity_too_small");
  });

  test("classifies model not served", () => {
    expect(
      classifyLaunchFailure(
        "Model foo is running; bar is not. Launch it from the frontend before sending requests.",
      ),
    ).toBe("model_not_served");
    expect(classifyLaunchFailure("No model is running. Launch foo from Local Studio.")).toBe(
      "model_not_served",
    );
    expect(
      classifyLaunchFailure(
        "Model auto-loading is disabled because the model was manually stopped.",
      ),
    ).toBe("model_not_served");
  });

  test("classifies backend unreachable", () => {
    expect(classifyLaunchFailure("Inference backend unavailable")).toBe("backend_unreachable");
    expect(classifyLaunchFailure("Connection refused")).toBe("backend_unreachable");
    expect(classifyLaunchFailure("upstream error", { spawnError: "ECONNREFUSED" })).toBe(
      "backend_unreachable",
    );
  });

  test("returns undefined for cancellation and unknown strings", () => {
    expect(classifyLaunchFailure("Launch cancelled")).toBeUndefined();
    expect(classifyLaunchFailure("Model switch cancelled")).toBeUndefined();
    expect(classifyLaunchFailure("Something completely unexpected happened")).toBeUndefined();
  });
});
