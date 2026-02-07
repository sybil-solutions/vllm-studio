import Foundation

struct ModelRecommendation: Codable, Identifiable {
  let id: String
  let name: String
  let sizeGb: Double?
  let minVramGb: Double?
  let description: String
  let tags: [String]
}

struct StudioRecommendationsResponse: Codable {
  let recommendations: [ModelRecommendation]
  let maxVramGb: Double
}

