import SwiftUI

struct RecipeRowView: View {
  let recipe: RecipeWithStatus
  let onLaunch: (String) -> Void

  var body: some View {
    HStack {
      VStack(alignment: .leading, spacing: 4) {
        Text(recipe.name)
          .font(AppTheme.bodyFont.weight(.medium))
          .foregroundColor(AppTheme.foreground)
        Text(recipe.modelPath)
          .font(AppTheme.captionFont)
          .foregroundColor(AppTheme.muted)
      }
      Spacer()
      BadgeView(text: recipe.status, color: badgeColor)
      Button(action: { onLaunch(recipe.id) }) {
        Text("Launch")
          .font(AppTheme.captionFont.weight(.medium))
          .foregroundColor(AppTheme.foreground)
          .padding(.horizontal, 12)
          .padding(.vertical, 6)
          .background(AppTheme.accent)
          .cornerRadius(8)
      }
      .buttonStyle(.plain)
    }
    .padding(.vertical, 4)
  }

  private var badgeColor: Color {
    switch recipe.status {
    case "running": return AppTheme.success
    case "starting": return AppTheme.warning
    default: return AppTheme.muted
    }
  }
}
