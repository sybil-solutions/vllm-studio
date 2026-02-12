// CRITICAL
import Foundation

/// Mutable recipe for editing with required core fields
struct Recipe: Codable, Identifiable {
  var id: String
  var name: String
  var modelPath: String
  var backend: String
  var envVars: [String: String]?
  var tensorParallelSize: Int
  var pipelineParallelSize: Int
  var maxModelLen: Int
  var gpuMemoryUtilization: Double
  var kvCacheDtype: String
  var maxNumSeqs: Int
  var trustRemoteCode: Bool
  var toolCallParser: String?
  var reasoningParser: String?
  var enableAutoToolChoice: Bool
  var quantization: String?
  var dtype: String?
  var host: String
  var port: Int
  var servedModelName: String?
  var pythonPath: String?
  var extraArgs: [String: AnyCodable]
  var maxThinkingTokens: Int?
  var thinkingMode: String
}

/// Recipe with runtime status for dashboard display
struct RecipeWithStatus: Codable, Identifiable {
  let id: String
  let name: String
  let modelPath: String
  let backend: String?
  let status: String
  let host: String?
  let port: Int?
  let servedModelName: String?
}

/// Default values for new recipes
enum RecipeDefaults {
  static func newRecipe() -> Recipe {
    Recipe(
      id: "", name: "New Recipe", modelPath: "", backend: "vllm", envVars: [:],
      tensorParallelSize: 1, pipelineParallelSize: 1, maxModelLen: 4096,
      gpuMemoryUtilization: 0.9, kvCacheDtype: "auto", maxNumSeqs: 128,
      trustRemoteCode: false, toolCallParser: nil, reasoningParser: nil,
      enableAutoToolChoice: true, quantization: nil, dtype: nil,
      host: "0.0.0.0", port: 8000, servedModelName: nil, pythonPath: nil,
      extraArgs: [:], maxThinkingTokens: nil, thinkingMode: "auto"
    )
  }
}

struct LaunchResult: Codable {
  let success: Bool
  let pid: Int?
  let message: String
  let logFile: String?
}

struct LaunchProgress: Codable {
  let recipeId: String?
  let stage: String
  let message: String
  let progress: Double?
}

struct BenchmarkResult: Codable {
  let success: Bool?
  let error: String?
  let modelId: String?
  let benchmark: BenchmarkStats?
}

struct BenchmarkStats: Codable {
  let promptTokens: Int
  let completionTokens: Int
  let totalTimeS: Double
  let prefillTps: Double
  let generationTps: Double
  let ttftMs: Double
}
