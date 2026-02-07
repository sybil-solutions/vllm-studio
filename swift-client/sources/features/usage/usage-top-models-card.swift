// CRITICAL
import SwiftUI

struct UsageTopModelsCard: View {
  let rows: [UsageModelRow]

  var body: some View {
    CardView {
      VStack(alignment: .leading, spacing: 10) {
        Text("Top Models").font(AppTheme.titleFont)
        Grid(alignment: .leading, horizontalSpacing: 10, verticalSpacing: 8) {
          GridRow {
            header("Model")
            header("Req")
            header("Tokens")
            header("Success")
          }
          Divider().gridCellUnsizedAxes(.horizontal)
          ForEach(Array(rows.prefix(8))) { row in
            GridRow {
              Text(row.model)
                .font(AppTheme.bodyFont.weight(.semibold))
                .foregroundColor(AppTheme.foreground)
                .lineLimit(1)
              Text("\(row.requests)")
                .font(AppTheme.monoFont)
                .foregroundColor(AppTheme.foreground)
              Text("\(row.totalTokens)")
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
      .font(AppTheme.captionFont)
      .foregroundColor(AppTheme.muted)
      .lineLimit(1)
  }
}

