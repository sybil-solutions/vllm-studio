// CRITICAL
import Foundation

final class SettingsStore: ObservableObject {
  @Published var backendUrl: String { didSet { save() } }
  @Published var apiKey: String { didSet { save() } }
  @Published var voiceUrl: String { didSet { save() } }
  @Published var voiceModel: String { didSet { save() } }
  @Published var mcpEnabled: Bool { didSet { save() } }
  @Published var planModeEnabled: Bool { didSet { save() } }
  @Published var deepResearchEnabled: Bool { didSet { save() } }
  @Published var deepResearchMaxSources: Int { didSet { save() } }
  @Published var deepResearchDepth: DeepResearchDepth { didSet { save() } }
  @Published var deepResearchAutoSummarize: Bool { didSet { save() } }
  @Published var deepResearchIncludeCitations: Bool { didSet { save() } }

  init() {
    let defaults = UserDefaults.standard
    backendUrl = defaults.string(forKey: "backend-url") ?? "http://localhost:8080"
    apiKey = defaults.string(forKey: "api-key") ?? ""
    voiceUrl = defaults.string(forKey: "voice-url") ?? "https://voice.homelabai.org"
    voiceModel = defaults.string(forKey: "voice-model") ?? "whisper-large-v3-turbo"
    mcpEnabled = defaults.object(forKey: "mcp-enabled") as? Bool ?? true
    planModeEnabled = defaults.object(forKey: "plan-mode-enabled") as? Bool ?? false
    deepResearchEnabled = defaults.object(forKey: "deep-research-enabled") as? Bool ?? DeepResearchConfig.default.enabled
    deepResearchMaxSources = defaults.object(forKey: "deep-research-max-sources") as? Int ?? DeepResearchConfig.default.maxSources
    let depthRaw = defaults.string(forKey: "deep-research-depth") ?? DeepResearchConfig.default.depth.rawValue
    deepResearchDepth = DeepResearchDepth(rawValue: depthRaw) ?? DeepResearchConfig.default.depth
    deepResearchAutoSummarize = defaults.object(forKey: "deep-research-auto-summarize") as? Bool ?? DeepResearchConfig.default.autoSummarize
    deepResearchIncludeCitations = defaults.object(forKey: "deep-research-include-citations") as? Bool ?? DeepResearchConfig.default.includeCitations
  }

  func saveNow() {
    save()
  }

  var deepResearchConfig: DeepResearchConfig {
    DeepResearchConfig(
      enabled: deepResearchEnabled,
      maxSources: deepResearchMaxSources,
      depth: deepResearchDepth,
      autoSummarize: deepResearchAutoSummarize,
      includeCitations: deepResearchIncludeCitations
    )
  }

  private func save() {
    let defaults = UserDefaults.standard
    defaults.set(backendUrl, forKey: "backend-url")
    defaults.set(apiKey, forKey: "api-key")
    defaults.set(voiceUrl, forKey: "voice-url")
    defaults.set(voiceModel, forKey: "voice-model")
    defaults.set(mcpEnabled, forKey: "mcp-enabled")
    defaults.set(planModeEnabled, forKey: "plan-mode-enabled")
    defaults.set(deepResearchEnabled, forKey: "deep-research-enabled")
    defaults.set(deepResearchMaxSources, forKey: "deep-research-max-sources")
    defaults.set(deepResearchDepth.rawValue, forKey: "deep-research-depth")
    defaults.set(deepResearchAutoSummarize, forKey: "deep-research-auto-summarize")
    defaults.set(deepResearchIncludeCitations, forKey: "deep-research-include-citations")
  }
}
