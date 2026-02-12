import Foundation

@MainActor
final class LogsViewModel: ObservableObject {
  @Published var sessions: [LogSession] = []
  @Published var loading = false

  private var api: ApiClient?

  func connect(api: ApiClient) {
    if self.api == nil { self.api = api }
    Task { await load() }
  }

  func load() async {
    guard let api else { return }
    loading = true
    defer { loading = false }
    sessions = (try? await api.getLogSessions().sessions) ?? []
  }

  func delete(id: String) async {
    guard let api else { return }
    _ = try? await api.deleteLog(sessionId: id)
    await load()
  }
}
