// CRITICAL
import Foundation

@MainActor
final class ChatListViewModel: ObservableObject {
  @Published var sessions: [ChatSession] = []
  @Published var loading = false
  @Published var creating = false
  @Published var error: String?

  private var api: ApiClient?

  func connect(api: ApiClient) {
    if self.api == nil { self.api = api }
    Task { await load() }
  }

  func load() async {
    guard let api else { return }
    loading = true
    defer { loading = false }
    do { sessions = try await api.getChatSessions() }
    catch { self.error = error.localizedDescription }
  }

  func createSession() async -> ChatSessionDetail? {
    guard let api else { return nil }
    creating = true
    defer { creating = false }
    do {
      let session = try await api.createChatSession(title: "New Chat", model: nil)
      insertSession(session)
      return session
    } catch {
      self.error = error.localizedDescription
      return nil
    }
  }

  func deleteSession(id: String) async {
    guard let api else { return }
    _ = try? await api.deleteChatSession(id: id)
    await load()
  }

  private func insertSession(_ detail: ChatSessionDetail) {
    let now = ISO8601DateFormatter().string(from: Date())
    let item = ChatSession(
      id: detail.id,
      title: detail.title,
      model: detail.model,
      parentId: detail.parentId,
      createdAt: now,
      updatedAt: now
    )
    if let idx = sessions.firstIndex(where: { $0.id == item.id }) {
      sessions[idx] = item
    } else {
      sessions.insert(item, at: 0)
    }
  }
}
