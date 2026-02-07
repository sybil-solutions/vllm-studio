import Foundation

@MainActor
final class LogDetailViewModel: ObservableObject {
  @Published var content = ""
  @Published var loading = false

  private var api: ApiClient?
  private var sessionId: String = ""
  private var task: Task<Void, Never>?

  func connect(api: ApiClient, sessionId: String) {
    self.api = api
    self.sessionId = sessionId
    Task { await load() }
    startStream()
  }

  func load() async {
    guard let api else { return }
    loading = true
    defer { loading = false }
    if let response = try? await api.getLogs(sessionId: sessionId, limit: 2000) {
      content = response.content ?? response.logs?.joined(separator: "\n") ?? ""
    }
  }

  func startStream() {
    guard let api else { return }
    task?.cancel()
    task = Task {
      let client = SseClient()
      let request = try? api.sseRequest(path: "/logs/\(sessionId)/stream")
      guard let request else { return }
      for await event in client.stream(request: request) {
        guard event.event == "log", let data = event.data.data(using: .utf8) else { continue }
        if let payload = try? ApiCodec.decoder.decode(SseEnvelope<LogLinePayload>.self, from: data) {
          content += (content.isEmpty ? "" : "\n") + payload.data.line
        }
      }
    }
  }

  func stop() {
    task?.cancel()
    task = nil
  }
}
