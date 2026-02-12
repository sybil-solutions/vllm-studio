import SwiftUI

// Design tokens aligned with `frontend/src/app/globals.css` (dark mode),
// plus a few extra "chrome" colors used by the web sidebar.
enum AppTheme {
  // Core palette (globals.css: .dark)
  static let background = Color(hex: 0x1c1b19) // --background
  static let foreground = Color(hex: 0xefece7) // --foreground
  static let muted = Color(hex: 0x9a9590)
  static let mutedForeground = Color(hex: 0xa59b8d) // --muted-foreground
  static let border = Color(hex: 0x363330) // --border
  static let card = Color(hex: 0x201f1d) // --card
  static let cardHover = Color(hex: 0x282624) // --card-hover
  static let accent = Color(hex: 0x382a46) // --accent
  static let accentHover = Color(hex: 0x47325d) // --accent-hover
  static let accentStrong = Color(hex: 0x995cd6) // --ring (used as "primary")
  static let link = Color(hex: 0xb285e0) // --link

  static let success = Color(hex: 0x3fa665)
  static let warning = Color(hex: 0xeea62b)
  static let error = Color(hex: 0xd14747)

  // App chrome (web sidebar + unified sidebar)
  static let chromeSidebar = Color(hex: 0x0a0a0a, alpha: 0.95)
  static let chromePanel = Color(hex: 0x050505)
  static let chromeBorder = Color.white.opacity(0.06)
  static let chromeBorderStrong = Color.white.opacity(0.10)

  // Type (approximate Geist with system fonts)
  static let titleFont = Font.system(size: 26, weight: .semibold)
  static let sectionFont = Font.system(size: 16, weight: .semibold)
  static let bodyFont = Font.system(size: 14, weight: .regular)
  static let captionFont = Font.system(size: 12, weight: .regular)
  static let monoFont = Font.system(size: 12, weight: .regular, design: .monospaced)
}
