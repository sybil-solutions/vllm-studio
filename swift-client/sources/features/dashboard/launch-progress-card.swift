import SwiftUI

struct LaunchProgressCard: View {
  let progress: LaunchProgress

  var body: some View {
    CardView {
      VStack(alignment: .leading, spacing: 12) {
        HStack {
          Text("Launch Progress")
            .font(AppTheme.sectionFont)
            .foregroundColor(AppTheme.foreground)
          Spacer()
          BadgeView(text: progress.stage, color: AppTheme.warning)
        }
        Text(progress.message)
          .font(AppTheme.bodyFont)
          .foregroundColor(AppTheme.muted)
        if let value = progress.progress {
          ProgressBar(value: value)
        }
      }
    }
  }
}
