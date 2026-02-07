import Foundation

struct StudioModelsResponse: Codable {
  let models: [StudioModelInfo]
  let roots: [StudioRoot]?
  let configuredModelsDir: String?
}

struct StudioModelInfo: Codable, Identifiable {
  var id: String { name }
  let name: String
  let path: String
  let format: String?
  let size: Int?
}

struct StudioRoot: Codable, Identifiable {
  var id: String { path }
  let path: String
  let exists: Bool
  let sources: [String]
  let recipeIds: [String]
}

struct HfModel: Codable, Identifiable {
  var id: String { modelId }
  let hfId: String?
  let modelId: String
  let pipelineTag: String?
  let likes: Int?
  let downloads: Int?
  let tags: [String]?
  let libraryName: String?
  let lastModified: String?
  let author: String?
  let isPrivate: Bool?

  enum CodingKeys: String, CodingKey {
    case hfId = "_id"
    case modelId
    case pipelineTag
    case likes
    case downloads
    case tags
    case libraryName
    case lastModified
    case author
    case isPrivate = "private"
  }
}

struct HfQuery {
  let search: String
  let filter: String
  let sort: String
  let limit: Int
  let offset: Int
}
