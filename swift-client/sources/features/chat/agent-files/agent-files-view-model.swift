// CRITICAL
import Foundation

struct AgentFileNode: Identifiable, Hashable {
  let id: String
  let name: String
  let type: AgentFileEntryType
  let size: Int?
  var children: [AgentFileNode]?

  var isDirectory: Bool { type == .dir }
}

@MainActor
final class AgentFilesViewModel: ObservableObject {
  @Published var nodes: [AgentFileNode] = []
  @Published var selectedPath: String?
  @Published var selectedContent: String = ""
  @Published var isDirty = false
  @Published var loading = false
  @Published var error: String?

  private var api: ApiClient?
  private var sessionId: String?

  func connect(api: ApiClient, sessionId: String) {
    if self.api == nil { self.api = api }
    if self.sessionId == nil { self.sessionId = sessionId }
    Task { await reload() }
  }

  func reload() async {
    guard let api, let sessionId else { return }
    loading = true
    defer { loading = false }
    do {
      let response = try await api.listAgentFiles(sessionId: sessionId, path: "", recursive: true)
      nodes = mapEntries(response.files, prefix: "")
    } catch {
      self.error = error.localizedDescription
    }
  }

  func openFile(path: String) async {
    guard let api, let sessionId else { return }
    loading = true
    defer { loading = false }
    do {
      let response = try await api.readAgentFile(sessionId: sessionId, path: path, includeVersions: false)
      selectedPath = response.path
      selectedContent = response.content
      isDirty = false
    } catch {
      self.error = error.localizedDescription
    }
  }

  func saveSelected() async {
    guard let api, let sessionId, let selectedPath else { return }
    loading = true
    defer { loading = false }
    do {
      _ = try await api.writeAgentFile(sessionId: sessionId, path: selectedPath, content: selectedContent, encoding: "utf8")
      isDirty = false
      await reload()
    } catch {
      self.error = error.localizedDescription
    }
  }

  func delete(path: String) async {
    guard let api, let sessionId else { return }
    loading = true
    defer { loading = false }
    do {
      _ = try await api.deleteAgentFile(sessionId: sessionId, path: path)
      if selectedPath == path {
        selectedPath = nil
        selectedContent = ""
        isDirty = false
      }
      await reload()
    } catch {
      self.error = error.localizedDescription
    }
  }

  func createDirectory(path: String) async {
    guard let api, let sessionId else { return }
    loading = true
    defer { loading = false }
    do {
      _ = try await api.createAgentDirectory(sessionId: sessionId, path: path)
      await reload()
    } catch {
      self.error = error.localizedDescription
    }
  }

  func move(from: String, to: String) async {
    guard let api, let sessionId else { return }
    loading = true
    defer { loading = false }
    do {
      _ = try await api.moveAgentFile(sessionId: sessionId, from: from, to: to)
      if selectedPath == from { selectedPath = to }
      await reload()
    } catch {
      self.error = error.localizedDescription
    }
  }

  private func mapEntries(_ entries: [AgentFileEntry], prefix: String) -> [AgentFileNode] {
    entries.map { entry in
      let path = prefix.isEmpty ? entry.name : "\(prefix)/\(entry.name)"
      return AgentFileNode(
        id: path,
        name: entry.name,
        type: entry.type,
        size: entry.size,
        children: entry.children.map { mapEntries($0, prefix: path) }
      )
    }
  }
}

