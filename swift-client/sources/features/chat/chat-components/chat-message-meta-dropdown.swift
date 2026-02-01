// CRITICAL
import SwiftUI

struct ChatMessageMetaDropdown: View {
  let hasReasoning: Bool
  let toolCalls: [ToolCall]
  let toolResults: [String]
  let onShowActions: () -> Void

  var body: some View {
    if !hasReasoning && toolCalls.isEmpty && toolResults.isEmpty {
      EmptyView()
    } else {
      HStack(spacing: 8) {
        HStack(spacing: 6) {
          if hasReasoning { chip("Reasoning", icon: "brain") }
          if !toolCalls.isEmpty { chip("\(toolCalls.count) tool\(toolCalls.count == 1 ? "" : "s")", icon: "wrench.and.screwdriver") }
          if !toolResults.isEmpty { chip("Results", icon: "checkmark.circle") }
        }
        Spacer()
        Button(action: onShowActions) {
          HStack(spacing: 4) {
            Text("Trace")
              .font(AppTheme.captionFont.weight(.medium))
            Image(systemName: "arrow.right")
              .font(.system(size: 10, weight: .semibold))
          }
          .foregroundColor(AppTheme.muted)
        }
      }
    }
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
