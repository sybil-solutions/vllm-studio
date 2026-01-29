// CRITICAL
import SwiftUI

struct ChatMessageMetaDropdown: View {
  let thinkingBlocks: [String]
  let toolCalls: [ToolCall]
  let toolResults: [String]
  let onShowActions: () -> Void
  @State private var isExpanded = false

  var body: some View {
    if thinkingBlocks.isEmpty && toolCalls.isEmpty && toolResults.isEmpty {
      EmptyView()
    } else {
      VStack(alignment: .leading, spacing: 8) {
        // Collapsed row — simple chips
        HStack(spacing: 8) {
          HStack(spacing: 6) {
            if !thinkingBlocks.isEmpty { chip("Thinking", icon: "brain") }
            if !toolCalls.isEmpty { chip("\(toolCalls.count) tool\(toolCalls.count == 1 ? "" : "s")", icon: "wrench.and.screwdriver") }
            if !toolResults.isEmpty { chip("Results", icon: "checkmark.circle") }
          }
          Spacer()
          Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
            .font(.system(size: 10, weight: .medium))
            .foregroundColor(AppTheme.muted)
        }
        .contentShape(Rectangle())
        .onTapGesture { withAnimation(.easeInOut(duration: 0.2)) { isExpanded.toggle() } }

        if isExpanded {
          VStack(alignment: .leading, spacing: 10) {
            if !thinkingBlocks.isEmpty {
              sectionLabel("Thinking")
              ForEach(thinkingBlocks, id: \.self) { block in
                Text(block)
                  .font(AppTheme.monoFont)
                  .foregroundColor(AppTheme.foreground.opacity(0.8))
                  .lineLimit(6)
                  .padding(10)
                  .frame(maxWidth: .infinity, alignment: .leading)
                  .background(AppTheme.card)
                  .cornerRadius(8)
              }
            }

            if !toolCalls.isEmpty {
              sectionLabel("Tool calls")
              ForEach(toolCalls) { call in
                VStack(alignment: .leading, spacing: 3) {
                  Text(call.function.name)
                    .font(AppTheme.captionFont.weight(.semibold))
                    .foregroundColor(AppTheme.foreground)
                  Text(call.function.arguments)
                    .font(AppTheme.monoFont)
                    .foregroundColor(AppTheme.muted)
                    .lineLimit(3)
                }
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(AppTheme.card)
                .cornerRadius(8)
              }
            }

            if !toolResults.isEmpty {
              sectionLabel("Results")
              ForEach(Array(toolResults.enumerated()), id: \.offset) { _, result in
                Text(result)
                  .font(AppTheme.monoFont)
                  .foregroundColor(AppTheme.muted)
                  .lineLimit(4)
                  .padding(10)
                  .frame(maxWidth: .infinity, alignment: .leading)
                  .background(AppTheme.card)
                  .cornerRadius(8)
              }
            }

            Button(action: onShowActions) {
              HStack(spacing: 4) {
                Text("View full log")
                  .font(AppTheme.captionFont.weight(.medium))
                Image(systemName: "arrow.right")
                  .font(.system(size: 10, weight: .semibold))
              }
              .foregroundColor(AppTheme.muted)
            }
          }
        }
      }
    }
  }

  private func sectionLabel(_ text: String) -> some View {
    Text(text)
      .font(AppTheme.captionFont.weight(.semibold))
      .foregroundColor(AppTheme.muted)
  }

  private func chip(_ text: String, icon: String) -> some View {
    HStack(spacing: 4) {
      Image(systemName: icon).font(.system(size: 10))
      Text(text).font(AppTheme.captionFont)
    }
    .foregroundColor(AppTheme.muted)
    .padding(.horizontal, 8)
    .padding(.vertical, 4)
    .background(AppTheme.card)
    .cornerRadius(999)
  }
}
