// CRITICAL
import SwiftUI

struct ChatAgentActionsSheet: View {
  let actions: ChatAgentActions
  @ObservedObject var service: OpenAIChatService

  private var thinkingBlocks: [String] {
    if service.isStreaming, !service.streamingReasoning.isEmpty {
      return [service.streamingReasoning]
    }
    return actions.meta.thinkingBlocks
  }

  private var toolCalls: [ToolCall] {
    if service.isStreaming, !service.streamingToolCalls.isEmpty {
      return service.streamingToolCalls
    }
    return actions.meta.toolCalls
  }

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 16) {
          // Timer
          if let start = actions.startedAt {
            TimelineView(.periodic(from: start, by: 1)) { ctx in
              let s = Int(ctx.date.timeIntervalSince(start))
              HStack(spacing: 6) {
                Circle().fill(service.isStreaming ? AppTheme.foreground : AppTheme.muted)
                  .frame(width: 6, height: 6)
                Text(service.isStreaming ? "Running • \(s)s" : "Completed • \(s)s")
                  .font(AppTheme.captionFont)
                  .foregroundColor(AppTheme.muted)
              }
            }
          }

          // Thinking
          if !thinkingBlocks.isEmpty {
            sectionHeader("Thinking", icon: "brain")
            ForEach(thinkingBlocks, id: \.self) { block in
              Text(block)
                .font(AppTheme.monoFont)
                .foregroundColor(AppTheme.foreground.opacity(0.85))
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(12)
                .background(AppTheme.card)
                .cornerRadius(8)
            }
          }

          // Tool calls
          if !toolCalls.isEmpty {
            sectionHeader("Tool calls", icon: "wrench.and.screwdriver")
            ForEach(toolCalls) { call in
              VStack(alignment: .leading, spacing: 4) {
                Text(call.function.name)
                  .font(AppTheme.captionFont.weight(.semibold))
                  .foregroundColor(AppTheme.foreground)
                Text(call.function.arguments)
                  .font(AppTheme.monoFont)
                  .foregroundColor(AppTheme.muted)
                  .lineLimit(8)
              }
              .frame(maxWidth: .infinity, alignment: .leading)
              .padding(12)
              .background(AppTheme.card)
              .cornerRadius(8)
            }
          }

          // Results
          if !actions.meta.toolResults.isEmpty {
            sectionHeader("Results", icon: "checkmark.circle")
            ForEach(Array(actions.meta.toolResults.enumerated()), id: \.offset) { _, result in
              Text(result)
                .font(AppTheme.monoFont)
                .foregroundColor(AppTheme.foreground.opacity(0.85))
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(12)
                .background(AppTheme.card)
                .cornerRadius(8)
                .lineLimit(20)
            }
          }

          if thinkingBlocks.isEmpty && toolCalls.isEmpty && actions.meta.toolResults.isEmpty {
            Text(service.isStreaming ? "Waiting for data..." : "No data recorded.")
              .font(AppTheme.bodyFont)
              .foregroundColor(AppTheme.muted)
              .frame(maxWidth: .infinity)
              .padding(.top, 40)
          }
        }
        .padding(16)
      }
      .background(AppTheme.background)
      .navigationTitle(actions.title)
      .navigationBarTitleDisplayMode(.inline)
    }
  }

  private func sectionHeader(_ text: String, icon: String) -> some View {
    HStack(spacing: 6) {
      Image(systemName: icon).font(.system(size: 11))
      Text(text).font(AppTheme.captionFont.weight(.semibold))
    }
    .foregroundColor(AppTheme.muted)
    .padding(.top, 4)
  }
}
