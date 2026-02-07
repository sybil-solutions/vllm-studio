// CRITICAL
import SwiftUI

struct ChatStreamingMessageView: View {
  @ObservedObject var service: OpenAIChatService
  let scrollProxy: ScrollViewProxy
  let onShowActions: (AgentMeta) -> Void
  @State private var showReasoning = false

  var body: some View {
    HStack {
      VStack(alignment: .leading, spacing: 10) {
        // Header with timer
        HStack(spacing: 6) {
          Image(systemName: "sparkles")
            .font(.system(size: 12))
            .foregroundColor(AppTheme.muted)
          Text("Assistant")
            .font(AppTheme.captionFont.weight(.medium))
            .foregroundColor(AppTheme.muted)
          Spacer()
          if let start = service.streamStart {
            TimelineView(.periodic(from: start, by: 1)) { ctx in
              let s = Int(ctx.date.timeIntervalSince(start))
              Text("\(s)s")
                .font(AppTheme.monoFont)
                .foregroundColor(AppTheme.muted)
            }
          }
        }

        // Collapsible reasoning block
        if !service.streamingReasoning.isEmpty {
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

            if showReasoning {
              Text(service.streamingReasoning)
                .font(AppTheme.monoFont)
                .foregroundColor(AppTheme.foreground.opacity(0.7))
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(AppTheme.card)
                .cornerRadius(8)
            }
          }
          .padding(10)
          .background(AppTheme.card.opacity(0.6))
          .cornerRadius(10)
        }

        // Content
        if !service.streamingContent.isEmpty {
          MarkdownText(content: service.streamingContent)
            .foregroundColor(AppTheme.foreground)
        } else if service.streamingReasoning.isEmpty {
          HStack(spacing: 8) {
            ProgressView().scaleEffect(0.7)
            Text("Thinking...")
              .font(AppTheme.bodyFont)
              .foregroundColor(AppTheme.muted)
          }
        }

        // Tool badges
        if !service.streamingToolCalls.isEmpty {
          HStack(spacing: 4) {
            Image(systemName: "wrench.and.screwdriver").font(.system(size: 10))
            Text("\(service.streamingToolCalls.count) tool\(service.streamingToolCalls.count == 1 ? "" : "s")")
              .font(AppTheme.captionFont)
          }
          .foregroundColor(AppTheme.muted)
          .padding(.horizontal, 8)
          .padding(.vertical, 4)
          .background(AppTheme.card)
          .cornerRadius(8)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
    }
    .id("streaming")
    .onChange(of: service.streamingContent) { _, _ in
      scrollProxy.scrollTo("streaming", anchor: .bottom)
    }
    .onChange(of: service.streamingReasoning) { _, _ in
      scrollProxy.scrollTo("streaming", anchor: .bottom)
    }
  }
}
