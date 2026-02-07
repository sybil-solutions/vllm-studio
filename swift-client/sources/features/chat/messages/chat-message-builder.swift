import Foundation

func buildOpenAIMessages(from messages: [StoredMessage]) -> [OpenAIMessage] {
  messages.map { msg in
    var content = msg.content
    if msg.role == "assistant" {
      if content?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true {
        let reasoning = msg.reasoningContent ?? msg.reasoning
        if let reasoning, !reasoning.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
          content = reasoning
        }
      }
      if let raw = content {
        content = ThinkingParser.stripThinkingBlocks(raw)
        content = ArtifactParser.stripArtifactBlocks(content!)
      }
    }
    return OpenAIMessage(role: msg.role, content: content, toolCalls: msg.toolCalls, toolCallId: msg.toolCallId, name: msg.name)
  }
}
