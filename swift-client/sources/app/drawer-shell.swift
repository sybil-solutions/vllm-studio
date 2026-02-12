// CRITICAL
import SwiftUI

struct DrawerShell: View {
  @State private var isOpen = false
  @State private var selection: DrawerRoute = .dashboard
  @State private var dragOffset: CGFloat = 0

  var body: some View {
    ZStack {
      contentView
        .simultaneousGesture(
          DragGesture()
            .onChanged { value in
              if value.startLocation.x < 40 && !isOpen {
                dragOffset = max(0, value.translation.width)
              }
            }
            .onEnded { value in
              if value.startLocation.x < 40 && !isOpen && value.translation.width > 60 {
                withAnimation(.easeInOut(duration: 0.2)) { isOpen = true }
              }
              dragOffset = 0
            }
        )

      if isOpen {
        DrawerMenu(isOpen: $isOpen, selection: $selection)
          .transition(.move(edge: .leading))
      }
    }
  }

  @ViewBuilder
  private var contentView: some View {
    switch selection {
    case .dashboard: navRoot { DashboardView() }
    case .chat: navRoot { ChatListView() }
    case .recipes: navRoot { RecipesView() }
    case .discover: navRoot { DiscoverView() }
    case .logs: navRoot { LogsView() }
    case .usage: navRoot { UsageView() }
    case .settings: navRoot { ConfigsView() }
    }
  }

  private func navRoot<Content: View>(@ViewBuilder content: () -> Content) -> some View {
    NavRootWrapper(content: content(), isOpen: $isOpen)
  }
}

private struct NavRootWrapper<Content: View>: View {
  let content: Content
  @Binding var isOpen: Bool

  var body: some View {
    NavigationStack {
      content
    }
    .toolbar {
      #if canImport(UIKit)
      ToolbarItem(placement: .navigationBarLeading) {
        Button(action: { withAnimation { isOpen.toggle() } }) {
          Image(systemName: "line.3.horizontal")
        }
      }
      #else
      ToolbarItem(placement: .cancellationAction) {
        Button(action: { withAnimation { isOpen.toggle() } }) {
          Image(systemName: "line.3.horizontal")
        }
      }
      #endif
    }
    .background(AppTheme.background)
  }
}

enum DrawerRoute: String, CaseIterable, Identifiable {
  case dashboard, chat, recipes, discover, logs, usage, settings
  var id: String { rawValue }
  var title: String {
    switch self {
    case .dashboard: "Dashboard"
    case .chat: "Chat"
    case .recipes: "Recipes"
    case .discover: "Discover"
    case .logs: "Logs"
    case .usage: "Usage"
    case .settings: "Settings"
    }
  }
  var icon: String {
    switch self {
    case .dashboard: "gauge"
    case .chat: "bubble.left.and.bubble.right"
    case .recipes: "book"
    case .discover: "compass"
    case .logs: "scroll"
    case .usage: "chart.bar"
    case .settings: "slider.horizontal.3"
    }
  }
}
