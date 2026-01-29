import SwiftUI

struct ChatUsageBar: View {
  let usage: ChatUsage?

  var body: some View {
    if let usage, usage.totalTokens > 0 {
      HStack(spacing: 8) {
        usagePill("In", value: usage.promptTokens)
        usagePill("Out", value: usage.completionTokens)
        usagePill("Total", value: usage.totalTokens)
      }
    }
  }

  private func usagePill(_ label: String, value: Int) -> some View {
    HStack(spacing: 3) {
      Text(label)
        .font(AppTheme.captionFont)
        .foregroundColor(AppTheme.muted)
      Text("\(value)")
        .font(AppTheme.monoFont)
        .foregroundColor(AppTheme.foreground.opacity(0.7))
    }
    .padding(.horizontal, 8)
    .padding(.vertical, 5)
    .background(AppTheme.card)
    .cornerRadius(6)
  }
}
