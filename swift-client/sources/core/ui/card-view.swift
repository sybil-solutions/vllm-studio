import SwiftUI

struct CardView<Content: View>: View {
  let content: Content
  init(@ViewBuilder content: () -> Content) { self.content = content() }

  var body: some View {
    content
      .padding(16)
      .background(AppTheme.card)
      .overlay(RoundedRectangle(cornerRadius: 16).stroke(AppTheme.border))
      .cornerRadius(16)
  }
}
