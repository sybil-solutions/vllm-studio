// CRITICAL
import SwiftUI

struct RootView: View {
  @Environment(\.horizontalSizeClass) private var horizontalSizeClass
  @EnvironmentObject private var themeManager: ThemeManager

  var body: some View {
    Group {
      if horizontalSizeClass == .regular {
        DesktopShell()
      } else {
        DrawerShell()
      }
    }
    .theme(themeManager.currentTheme)
    .accentTint(themeManager.currentTheme)
    .preferredColorScheme(.dark)
  }
}