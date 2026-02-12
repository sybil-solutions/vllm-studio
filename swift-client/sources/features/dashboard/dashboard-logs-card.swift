import SwiftUI

struct DashboardLogsCard: View {
  let session: LogSession?
  let lines: [String]

  private static let noisePatterns = [
    "GET /health",
    "GET /metrics",
    "HEAD /health",
    "GET /ping",
  ]

  private var filteredLines: [String] {
    lines.filter { line in
      !Self.noisePatterns.contains { line.contains($0) }
    }
  }

  var body: some View {
    CardView {
      VStack(alignment: .leading, spacing: 12) {
        Text("Logs")
          .font(AppTheme.sectionFont)
          .foregroundColor(AppTheme.foreground)
        if let session {
          Text(session.model ?? session.recipeName ?? session.id)
            .font(AppTheme.captionFont)
            .foregroundColor(AppTheme.muted)
        }
        let display = filteredLines
        if display.isEmpty {
          Text("No logs yet")
            .font(AppTheme.bodyFont)
            .foregroundColor(AppTheme.muted)
            .padding(.vertical, 8)
        } else {
          VStack(alignment: .leading, spacing: 4) {
            ForEach(Array(display.suffix(6)), id: \.self) { line in
              Text(line)
                .font(AppTheme.monoFont)
                .foregroundColor(AppTheme.foreground)
                .lineLimit(1)
            }
          }
        }
      }
    }
  }
}
