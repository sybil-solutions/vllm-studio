import Foundation

extension ApiClient {
  func getStudioRecommendations() async throws -> StudioRecommendationsResponse {
    try await request("/studio/recommendations")
  }
}
