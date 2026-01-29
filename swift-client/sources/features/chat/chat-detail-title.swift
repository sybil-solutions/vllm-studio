import Foundation

extension ChatDetailViewModel {
  func updateTitle(user: String, assistant: String, api: ApiClient) async {
    let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    let defaults = ["", "new chat", "untitled", "chat"]
    guard defaults.contains(trimmed) else { return }
    let generated = try? await api.generateTitle(model: sessionModel, user: user, assistant: assistant)
    let fallback = fallbackTitle(user: user, assistant: assistant)
    let candidate = generated?.title.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    let finalTitle = candidate.isEmpty ? fallback : candidate
    guard !finalTitle.isEmpty else { return }
    title = finalTitle
    _ = try? await api.updateChatSession(id: sessionId, title: finalTitle, model: nil)
  }

  private func fallbackTitle(user: String, assistant: String) -> String {
    let userTrimmed = user.trimmingCharacters(in: .whitespacesAndNewlines)
    let base = userTrimmed.isEmpty ? assistant : userTrimmed
    let cleaned = base.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
      .trimmingCharacters(in: .whitespacesAndNewlines)
    guard !cleaned.isEmpty else { return "" }
    let words = cleaned.split(separator: " ")
    let prefix = words.prefix(6).joined(separator: " ")
    return String(prefix.prefix(60))
  }
}
