import Foundation

extension ChatDetailViewModel {
  var visibleMessages: [StoredMessage] {
    messages.filter { $0.role != "tool" }
  }

  func meta(for message: StoredMessage) -> AgentMeta? {
    if let meta = agentMeta[message.id] { return meta }
    guard message.role == "assistant" else { return nil }
    let thinking = thinkingBlocks(for: message)
    let calls = message.toolCalls ?? []
    let results = toolResults(for: calls)
    return thinking.isEmpty && calls.isEmpty && results.isEmpty ? nil : AgentMeta(thinkingBlocks: thinking, toolCalls: calls, toolResults: results)
  }

  func rebuildAgentMeta() {
    var updated: [String: AgentMeta] = [:]
    for message in messages where message.role == "assistant" {
      let thinking = thinkingBlocks(for: message)
      let calls = message.toolCalls ?? []
      let results = toolResults(for: calls)
      if !thinking.isEmpty || !calls.isEmpty || !results.isEmpty {
        updated[message.id] = AgentMeta(thinkingBlocks: thinking, toolCalls: calls, toolResults: results)
      }
    }
    agentMeta = updated
  }

  private func thinkingBlocks(for message: StoredMessage) -> [String] {
    let reasoning = (message.reasoningContent ?? message.reasoning)?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    if !reasoning.isEmpty { return [reasoning] }
    return ThinkingParser.extractAllBlocks(message.content ?? "")
  }

  private func toolResults(for calls: [ToolCall]) -> [String] {
    let ids = Set(calls.map { $0.id })
    return messages.filter { $0.role == "tool" && ($0.toolCallId.map { ids.contains($0) } ?? false) }
      .compactMap { $0.content }
  }
}
