// CRITICAL
import Charts
import SwiftUI

struct UsageActivityCard: View {
  let daily: [UsageDaily]
  let hourly: [UsageHourly]

  var body: some View {
    CardView {
      VStack(alignment: .leading, spacing: 16) {
        Text("Activity")
          .font(AppTheme.sectionFont)
          .foregroundColor(AppTheme.foreground)
        
        VStack(alignment: .leading, spacing: 8) {
          Text("Daily tokens")
            .font(AppTheme.captionFont)
            .foregroundColor(AppTheme.muted)
          Chart(Array(daily.prefix(14).reversed())) { row in
            BarMark(
              x: .value("Date", row.date),
              y: .value("Tokens", row.totalTokens)
            )
            .foregroundStyle(AppTheme.accentStrong)
          }
          .chartYAxis { AxisMarks(position: .leading) }
          .frame(height: 140)
        }

        Divider()
          .background(AppTheme.border)

        VStack(alignment: .leading, spacing: 8) {
          Text("Hourly pattern")
            .font(AppTheme.captionFont)
            .foregroundColor(AppTheme.muted)
          Chart(hourly) { row in
            BarMark(
              x: .value("Hour", row.hour),
              y: .value("Tokens", row.tokens)
            )
            .foregroundStyle(AppTheme.accent)
          }
          .chartXAxis { AxisMarks(values: Array(stride(from: 0, to: 24, by: 3))) }
          .chartYAxis { AxisMarks(position: .leading) }
          .frame(height: 120)
        }
      }
    }
  }
}
