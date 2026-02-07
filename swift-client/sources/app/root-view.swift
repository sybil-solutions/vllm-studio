import SwiftUI

struct RootView: View {
  @Environment(\.horizontalSizeClass) private var horizontalSizeClass

  var body: some View {
    Group {
      if horizontalSizeClass == .regular {
        DesktopShell()
      } else {
        DrawerShell()
      }
    }
      .tint(AppTheme.accentStrong)
      .foregroundColor(AppTheme.foreground)
      .font(AppTheme.bodyFont)
      .background(AppTheme.background.ignoresSafeArea())
      .preferredColorScheme(ColorScheme.dark)
  }
}
