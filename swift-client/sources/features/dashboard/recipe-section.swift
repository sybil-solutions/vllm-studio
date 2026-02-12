import SwiftUI

struct RecipeSection: View {
  let recipes: [RecipeWithStatus]
  let isRunning: Bool
  let onLaunch: (String) -> Void
  let onEvict: () -> Void

  var body: some View {
    CardView {
      VStack(alignment: .leading, spacing: 12) {
        HStack {
          Text("Recipes")
            .font(AppTheme.sectionFont)
            .foregroundColor(AppTheme.foreground)
          Spacer()
        }
        if recipes.isEmpty {
          Text("No recipes yet")
            .font(AppTheme.bodyFont)
            .foregroundColor(AppTheme.muted)
            .padding(.vertical, 8)
        } else {
          VStack(spacing: 8) {
            ForEach(recipes) { recipe in
              RecipeRowView(recipe: recipe, onLaunch: onLaunch)
            }
          }
        }
        if isRunning {
          Button(action: onEvict) {
            Text("Evict Model")
              .font(AppTheme.bodyFont.weight(.medium))
              .foregroundColor(AppTheme.error)
              .padding(.horizontal, 16)
              .padding(.vertical, 8)
              .background(AppTheme.error.opacity(0.15))
              .cornerRadius(8)
          }
          .buttonStyle(.plain)
          .padding(.top, 4)
        }
      }
    }
  }
}
