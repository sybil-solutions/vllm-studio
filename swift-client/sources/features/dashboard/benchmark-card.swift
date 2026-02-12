import SwiftUI

struct BenchmarkCard: View {
  let result: BenchmarkResult

  var body: some View {
    CardView {
      VStack(alignment: .leading, spacing: 12) {
        Text("Benchmark")
          .font(AppTheme.sectionFont)
          .foregroundColor(AppTheme.foreground)
        if let stats = result.benchmark {
          VStack(alignment: .leading, spacing: 8) {
            HStack {
              Text("Tokens")
                .font(AppTheme.captionFont)
                .foregroundColor(AppTheme.muted)
              Spacer()
              Text("\(stats.completionTokens)")
                .font(AppTheme.bodyFont)
                .foregroundColor(AppTheme.foreground)
            }
            HStack {
              Text("Time")
                .font(AppTheme.captionFont)
                .foregroundColor(AppTheme.muted)
              Spacer()
              Text(String(format: "%.2fs", stats.totalTimeS))
                .font(AppTheme.bodyFont)
                .foregroundColor(AppTheme.foreground)
            }
            HStack {
              Text("TPS")
                .font(AppTheme.captionFont)
                .foregroundColor(AppTheme.muted)
              Spacer()
              Text(String(format: "%.1f", stats.generationTps))
                .font(AppTheme.bodyFont)
                .foregroundColor(AppTheme.foreground)
            }
          }
        } else {
          Text(result.error ?? "No benchmark data")
            .font(AppTheme.bodyFont)
            .foregroundColor(AppTheme.muted)
            .padding(.vertical, 8)
        }
      }
    }
  }
}
