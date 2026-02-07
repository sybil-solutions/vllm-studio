// CRITICAL
import Foundation

struct ToolCallTrace: Identifiable, Hashable {
  let id: String
  let functionName: String
  let arguments: String
  let result: String?
}

struct ToolCallTraceGroup: Identifiable, Hashable {
  let id: String
  let title: String
  let calls: [ToolCallTrace]
}

@MainActor
final class ChatTracesViewModel: ObservableObject {
  @Published var groups: [ToolCallTraceGroup] = []
  @Published var loading = false
  @Published var error: String?

  private var api: ApiClient?
  private var sessionId: String?

  func connect(api: ApiClient, sessionId: String) {
    if self.api == nil { self.api = api }
    self.sessionId = sessionId
    Task { await load() }
  }

  func load() async {
    guard let api, let sessionId else { return }
    loading = true
    defer { loading = false }
    do {
      let session = try await api.getChatSession(id: sessionId)
      groups = buildGroups(messages: session.messages)
    } catch {
      self.error = error.localizedDescription
    }
  }

  private func buildGroups(messages: [StoredMessage]) -> [ToolCallTraceGroup] {
    var resultsByToolCallId: [String: String] = [:]
    for message in messages where message.role == "tool" {
      guard let id = message.toolCallId else { continue }
      resultsByToolCallId[id] = message.content ?? ""
    }

    var out: [ToolCallTraceGroup] = []
    for message in messages where message.role == "assistant" {
      guard let calls = message.toolCalls, !calls.isEmpty else { continue }
      let traces: [ToolCallTrace] = calls.map { call in
        ToolCallTrace(
          id: call.id,
          functionName: call.function.name,
          arguments: call.function.arguments,
          result: resultsByToolCallId[call.id]
        )
      }
      let title = message.createdAt ?? message.id
      out.append(ToolCallTraceGroup(id: message.id, title: title, calls: traces))
    }
    return out
  }
}
