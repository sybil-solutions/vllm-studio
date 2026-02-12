import SwiftUI

struct UsageTokensCard: View {
  let tokens: TokensPerRequest

  var body: some View {
    CardView {
      VStack(alignment: .leading, spacing: 12) {
        Text("Tokens per Request")
          .font(AppTheme.sectionFont)
          .foregroundColor(AppTheme.foreground)
        VStack(spacing: 8) {
          UsageMetricRow(label: "Avg", value: formatCount(tokens.avg))
          UsageMetricRow(label: "Avg prompt", value: formatCount(tokens.avgPrompt))
          UsageMetricRow(label: "Avg completion", value: formatCount(tokens.avgCompletion))
          UsageMetricRow(label: "P95", value: formatCount(tokens.p95))
          UsageMetricRow(label: "Max", value: formatCount(tokens.max))
        }
      }
    }
  }
}
