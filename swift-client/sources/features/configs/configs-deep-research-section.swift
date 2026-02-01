import SwiftUI

struct ConfigsDeepResearchSection: View {
  @ObservedObject var settings: SettingsStore

  var body: some View {
    Section("Deep Research") {
      Toggle("Enabled", isOn: $settings.deepResearchEnabled)
      Picker("Search depth", selection: $settings.deepResearchDepth) {
        ForEach(DeepResearchDepth.allCases) { depth in
          Text(depth.label).tag(depth)
        }
      }
      .pickerStyle(.segmented)
      Stepper("Max sources: \(settings.deepResearchMaxSources)", value: $settings.deepResearchMaxSources, in: 1...30)
      Toggle("Auto summarize", isOn: $settings.deepResearchAutoSummarize)
      Toggle("Include citations", isOn: $settings.deepResearchIncludeCitations)
    }
  }
}
