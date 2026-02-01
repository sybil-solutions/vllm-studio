// CRITICAL
import SwiftUI

struct MessageActionHandlers {
  let onCopy: () -> Void
  let onContext: () -> Void
  let onFork: () -> Void
  let onRetry: () -> Void
}

struct ChatMessageRow: View {
  let message: StoredMessage
  let isStreaming: Bool
  let meta: AgentMeta?
  let onShowActions: (AgentMeta) -> Void
  let actions: MessageActionHandlers?

  @State private var selectedArtifact: Artifact?
  @State private var showReasoning = false

  private var isUser: Bool { message.role == "user" }

  var body: some View {
    if isUser {
      userBubble
    } else {
      assistantBlock
    }
  }

  // MARK: - User message: right-aligned bubble

  private var userBubble: some View {
    HStack {
      Spacer(minLength: 40)
      Text(message.content ?? "")
        .font(AppTheme.bodyFont)
        .lineSpacing(4)
        .multilineTextAlignment(.leading)
        .foregroundColor(AppTheme.foreground)
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(AppTheme.card)
        .cornerRadius(18)
    }
  }

  // MARK: - Assistant message

  private var assistantBlock: some View {
    let hasContent = !artifactResult.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    let hasToolCalls = meta?.toolCalls.isEmpty == false
    let isToolCallOnly = !hasContent && !hasReasoning && hasToolCalls && !isStreaming

    return HStack {
      HStack(alignment: .top, spacing: 12) {
        RoundedRectangle(cornerRadius: 1)
          .fill(
            LinearGradient(
              colors: [
                AppTheme.accentStrong.opacity(0.8),
                AppTheme.accent.opacity(0.2),
              ],
              startPoint: .top,
              endPoint: .bottom
            )
          )
          .frame(width: 3)
          .padding(.top, isToolCallOnly ? 6 : 10)

        VStack(alignment: .leading, spacing: isToolCallOnly ? 0 : 12) {
          // Assistant header (hide for tool-call-only messages)
          if !isToolCallOnly {
            HStack(spacing: 6) {
              Image(systemName: "sparkles")
                .font(.system(size: 11))
                .foregroundColor(AppTheme.muted)
              Text("Assistant")
                .font(AppTheme.captionFont.weight(.medium))
                .foregroundColor(AppTheme.muted)
              Spacer()
            }
          }

          // Reasoning block
          if hasReasoning {
            VStack(alignment: .leading, spacing: 6) {
              Button(action: { withAnimation(.easeInOut(duration: 0.15)) { showReasoning.toggle() } }) {
                HStack(spacing: 6) {
                  Image(systemName: "brain").font(.system(size: 11))
                  Text(showReasoning ? "Reasoning" : "Reasoning...")
                    .font(AppTheme.captionFont.weight(.medium))
                  Spacer()
                  Image(systemName: showReasoning ? "chevron.up" : "chevron.down")
                    .font(.system(size: 10))
                }
                .foregroundColor(AppTheme.muted)
              }
              .buttonStyle(.plain)
              .accessibilityLabel(showReasoning ? "Hide reasoning" : "Show reasoning")

              if showReasoning {
                VStack(alignment: .leading, spacing: 8) {
                  ForEach(Array(reasoningBlocks.enumerated()), id: \.offset) { _, block in
                    Text(block)
                      .font(AppTheme.monoFont)
                      .foregroundColor(AppTheme.foreground.opacity(0.7))
                      .padding(10)
                      .frame(maxWidth: .infinity, alignment: .leading)
                      .background(AppTheme.card)
                      .cornerRadius(8)
                  }
                }
              }
            }
            .padding(10)
            .background(AppTheme.card.opacity(0.6))
            .cornerRadius(10)
          }

          // Message content
          if isStreaming {
            MarkdownText(content: parsed.main)
              .foregroundColor(AppTheme.foreground)
          } else if hasContent {
            MarkdownText(content: artifactResult.text)
              .foregroundColor(AppTheme.foreground)

            // Artifact cards
            if !artifactResult.artifacts.isEmpty {
              ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                  ForEach(artifactResult.artifacts) { artifact in
                    ArtifactCard(artifact: artifact) { selectedArtifact = artifact }
                  }
                }
              }
            }
          }

          // Meta row for tools/results
          if let meta, hasReasoning || !meta.toolCalls.isEmpty || !meta.toolResults.isEmpty {
            ChatMessageMetaDropdown(
              hasReasoning: hasReasoning,
              toolCalls: meta.toolCalls,
              toolResults: meta.toolResults,
              onShowActions: { onShowActions(meta) }
            )
          }

          if let actions, message.role == "assistant" {
            MessageActionBar(actions: actions)
          }
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      Spacer(minLength: 40)
    }
    .sheet(item: $selectedArtifact) { artifact in
      ArtifactViewerSheet(artifact: artifact)
    }
  }

  private var assistantContent: String {
    guard message.role == "assistant" else { return message.content ?? "" }
    return message.content ?? ""
  }

  private var parsed: ThinkingResult {
    ThinkingParser.parse(assistantContent)
  }

  private var artifactResult: ArtifactParseResult {
    guard message.role == "assistant" else {
      return ArtifactParseResult(text: parsed.main, artifacts: [])
    }
    return ArtifactParser.parse(parsed.main)
  }

  private var reasoningText: String {
    let explicit = (message.reasoningContent ?? message.reasoning ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    if !explicit.isEmpty { return explicit }
    return parsed.thinking?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
  }

  private var reasoningBlocks: [String] {
    let blocks = meta?.thinkingBlocks ?? []
    if !blocks.isEmpty { return blocks.filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty } }
    let fallback = reasoningText.trimmingCharacters(in: .whitespacesAndNewlines)
    return fallback.isEmpty ? [] : [fallback]
  }

  private var hasReasoning: Bool {
    !reasoningBlocks.isEmpty
  }
}

private struct MessageActionBar: View {
  let actions: MessageActionHandlers

  var body: some View {
    HStack(spacing: 10) {
      iconButton(systemImage: "arrow.branch", label: "Fork", action: actions.onFork)
      iconButton(systemImage: "doc.on.doc", label: "Copy", action: actions.onCopy)
      iconButton(systemImage: "arrow.clockwise", label: "Retry", action: actions.onRetry)
      iconButton(systemImage: "info.circle", label: "Info", action: actions.onContext)
    }
    .padding(.horizontal, 6)
    .padding(.vertical, 6)
    .background(AppTheme.card.opacity(0.6))
    .cornerRadius(10)
    .overlay(
      RoundedRectangle(cornerRadius: 10)
        .stroke(AppTheme.border, lineWidth: 1)
    )
  }

  private func iconButton(systemImage: String, label: String, action: @escaping () -> Void) -> some View {
    Button(action: action) {
      iconLabel(systemImage: systemImage)
    }
    .buttonStyle(.plain)
    .accessibilityLabel(label)
  }

  private func iconLabel(systemImage: String) -> some View {
    Image(systemName: systemImage)
      .font(.system(size: 12, weight: .semibold))
      .foregroundColor(AppTheme.foreground)
      .frame(width: 28, height: 28)
      .background(AppTheme.background)
      .cornerRadius(10)
  }
}

extension ChatMessageRow: Equatable {
  static func == (lhs: ChatMessageRow, rhs: ChatMessageRow) -> Bool {
    lhs.message.id == rhs.message.id
      && lhs.message.content == rhs.message.content
      && lhs.message.reasoningContent == rhs.message.reasoningContent
      && lhs.message.reasoning == rhs.message.reasoning
      && lhs.isStreaming == rhs.isStreaming
      && lhs.meta?.thinkingBlocks == rhs.meta?.thinkingBlocks
      && (lhs.meta?.toolCalls.count ?? 0) == (rhs.meta?.toolCalls.count ?? 0)
      && (lhs.meta?.toolResults.count ?? 0) == (rhs.meta?.toolResults.count ?? 0)
  }
}
