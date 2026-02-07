// CRITICAL
import Foundation

enum AgentFileEntryType: String, Codable {
  case file
  case dir
}

struct AgentFileEntry: Codable, Identifiable {
  var id: String { name }
  let name: String
  let type: AgentFileEntryType
  let size: Int?
  let children: [AgentFileEntry]?
}

struct AgentFilesListResponse: Codable {
  let files: [AgentFileEntry]
  let path: String?
}

struct AgentFileVersion: Codable, Identifiable {
  var id: Int { version }
  let version: Int
  let content: String
  let timestamp: Int
}

struct AgentFileReadResponse: Codable {
  let path: String
  let content: String
  let versions: [AgentFileVersion]?
}

struct AgentFileSuccessResponse: Codable {
  let success: Bool
}

