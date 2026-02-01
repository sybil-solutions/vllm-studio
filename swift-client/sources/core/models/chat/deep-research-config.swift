import Foundation

enum DeepResearchDepth: String, CaseIterable, Codable, Identifiable {
  case shallow
  case medium
  case deep

  var id: String { rawValue }

  var label: String {
    switch self {
    case .shallow: return "Shallow"
    case .medium: return "Medium"
    case .deep: return "Deep"
    }
  }
}

struct DeepResearchConfig: Codable {
  var enabled: Bool
  var maxSources: Int
  var depth: DeepResearchDepth
  var autoSummarize: Bool
  var includeCitations: Bool

  static let `default` = DeepResearchConfig(
    enabled: false,
    maxSources: 6,
    depth: .medium,
    autoSummarize: true,
    includeCitations: true
  )
}
