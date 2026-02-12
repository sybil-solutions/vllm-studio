// CRITICAL
import SwiftUI

struct UsageTopModelsCard: View {
  let rows: [UsageModelRow]

  var body: some View {
    CardView {
      VStack(alignment: .leading, spacing: 16) {
        Text("Top Models")
          .font(AppTheme.sectionFont)
          .foregroundColor(AppTheme.foreground)
        Grid(alignment: .leading, horizontalSpacing: 12, verticalSpacing: 10) {
          GridRow {
            header("Model")
            header("Req")
            header("Tokens")
            header("Success")
          }
          Divider()
            .background(AppTheme.border)
            .gridCellUnsizedAxes(.horizontal)
          ForEach(Array(rows.prefix(8))) { row in
            GridRow {
              Text(row.model)
                .font(AppTheme.bodyFont.weight(.medium))
                .foregroundColor(AppTheme.foreground)
                .lineLimit(1)
              Text(formatCount(row.requests))
                .font(AppTheme.monoFont)
                .foregroundColor(AppTheme.foreground)
              Text(formatCount(row.totalTokens))
                .font(AppTheme.monoFont)
                .foregroundColor(AppTheme.foreground)
              Text(String(format: "%.0f%%", row.successRate))
                .font(AppTheme.monoFont)
                .foregroundColor(AppTheme.foreground)
            }
          }
        }
      }
    }
  }

  private func header(_ title: String) -> some View {
    Text(title)
      .font(AppTheme.captionFont.weight(.medium))
      .foregroundColor(AppTheme.muted)
      .lineLimit(1)
  }
}
