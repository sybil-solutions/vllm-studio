import SwiftUI

struct EmptyStateView: View {
  let title: String
  let systemImage: String
  let message: String?

  init(_ title: String, systemImage: String, message: String? = nil) {
    self.title = title
    self.systemImage = systemImage
    self.message = message
  }

  var body: some View {
    VStack(spacing: 10) {
      Image(systemName: systemImage)
        .font(.system(size: 26, weight: .light))
        .foregroundColor(AppTheme.muted.opacity(0.7))
      Text(title)
        .font(AppTheme.sectionFont)
        .foregroundColor(AppTheme.foreground)
      if let message, !message.isEmpty {
        Text(message)
          .font(AppTheme.bodyFont)
          .foregroundColor(AppTheme.muted)
          .multilineTextAlignment(.center)
          .frame(maxWidth: 360)
      }
    }
    .padding(16)
    .frame(maxWidth: .infinity)
  }
}

