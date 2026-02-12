import SwiftUI

struct UsageSummaryCard: View {
  let totals: UsageTotals

  var body: some View {
    CardView {
      VStack(alignment: .leading, spacing: 12) {
        Text("Totals")
          .font(AppTheme.sectionFont)
          .foregroundColor(AppTheme.foreground)
        VStack(spacing: 8) {
          UsageMetricRow(label: "Total tokens", value: formatCount(totals.totalTokens))
          UsageMetricRow(label: "Prompt tokens", value: formatCount(totals.promptTokens))
          UsageMetricRow(label: "Completion tokens", value: formatCount(totals.completionTokens))
          UsageMetricRow(label: "Requests", value: formatCount(totals.totalRequests))
          UsageMetricRow(label: "Success rate", value: String(format: "%.1f%%", totals.successRate))
          UsageMetricRow(label: "Unique sessions", value: formatCount(totals.uniqueSessions))
        }
      }
    }
  }
}
