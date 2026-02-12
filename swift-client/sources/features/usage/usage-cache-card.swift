import SwiftUI

struct UsageCacheCard: View {
  let cache: UsageCache

  var body: some View {
    CardView {
      VStack(alignment: .leading, spacing: 12) {
        Text("Cache")
          .font(AppTheme.sectionFont)
          .foregroundColor(AppTheme.foreground)
        VStack(spacing: 8) {
          UsageMetricRow(label: "Hit rate", value: String(format: "%.1f%%", cache.hitRate))
          UsageMetricRow(label: "Hits", value: formatCount(cache.hits))
          UsageMetricRow(label: "Misses", value: formatCount(cache.misses))
          UsageMetricRow(label: "Hit tokens", value: formatCount(cache.hitTokens))
        }
      }
    }
  }
}
