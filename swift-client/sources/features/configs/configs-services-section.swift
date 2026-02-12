import SwiftUI

struct ConfigsServicesSection: View {
  let services: [ServiceInfo]

  var body: some View {
    VStack(spacing: 10) {
      ForEach(services, id: \.name) { service in
        HStack(alignment: .firstTextBaseline) {
          VStack(alignment: .leading, spacing: 2) {
            Text(service.name).font(AppTheme.bodyFont.weight(.semibold))
            Text("Port " + formatPort(service.port))
              .font(AppTheme.captionFont)
              .foregroundColor(AppTheme.muted)
          }
          Spacer()
          BadgeView(text: service.status, color: badge(for: service.status))
        }
        if service.name != services.last?.name { Divider() }
      }
    }
  }

  private func badge(for status: String) -> Color {
    switch status {
    case "running": return AppTheme.success
    case "stopped": return AppTheme.muted
    default: return AppTheme.warning
    }
  }
}
