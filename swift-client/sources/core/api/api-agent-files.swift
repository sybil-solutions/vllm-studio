// CRITICAL
import Foundation

extension ApiClient {
  func listAgentFiles(sessionId: String, path: String = "", recursive: Bool = true) async throws -> AgentFilesListResponse {
    var parts: [String] = []
    if !path.isEmpty { parts.append("path=\(encodeQuery(path))") }
    parts.append("recursive=\(recursive ? "true" : "false")")
    let query = parts.isEmpty ? "" : "?" + parts.joined(separator: "&")
    return try await request("/chats/\(encodePath(sessionId))/files\(query)")
  }

  func readAgentFile(sessionId: String, path: String, includeVersions: Bool = false) async throws -> AgentFileReadResponse {
    let versions = includeVersions ? "?include_versions=1" : ""
    return try await request("/chats/\(encodePath(sessionId))/files/\(encodeFilePath(path))\(versions)")
  }

  func writeAgentFile(
    sessionId: String,
    path: String,
    content: String,
    encoding: String = "utf8"
  ) async throws -> AgentFileSuccessResponse {
    let payload = ["path": path, "content": content, "encoding": encoding]
    let body = try ApiCodec.encoder.encode(payload)
    return try await request("/chats/\(encodePath(sessionId))/files/\(encodeFilePath(path))", method: "PUT", body: body)
  }

  func deleteAgentFile(sessionId: String, path: String) async throws -> AgentFileSuccessResponse {
    try await request("/chats/\(encodePath(sessionId))/files/\(encodeFilePath(path))", method: "DELETE")
  }

  func createAgentDirectory(sessionId: String, path: String) async throws -> AgentFileSuccessResponse {
    let body = try ApiCodec.encoder.encode(["path": path])
    return try await request("/chats/\(encodePath(sessionId))/files/dir", method: "POST", body: body)
  }

  func moveAgentFile(sessionId: String, from: String, to: String) async throws -> AgentFileSuccessResponse {
    let body = try ApiCodec.encoder.encode(["from": from, "to": to])
    return try await request("/chats/\(encodePath(sessionId))/files/move", method: "POST", body: body)
  }
}

private func encodePath(_ value: String) -> String {
  value.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? value
}

private func encodeQuery(_ value: String) -> String {
  value.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? value
}

private func encodeFilePath(_ value: String) -> String {
  value
    .split(separator: "/", omittingEmptySubsequences: true)
    .map { component in
      component.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? String(component)
    }
    .joined(separator: "/")
}

