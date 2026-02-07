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
    case .discover: navRoot { DiscoverView() }
    case .usage: navRoot { UsageView() }
    case .configs: navRoot { ConfigsView() }
    case .logs: navRoot { LogsView() }
    }
  }

  @ViewBuilder
  private func navRoot(@ViewBuilder _ content: () -> some View) -> some View {
    NavigationStack {
      content()
    }
    .toolbar {
      ToolbarItem(placement: .navigationBarLeading) {
        Button(action: { withAnimation { isOpen.toggle() } }) {
          Image(systemName: "line.3.horizontal")
        }
      }
    }
    .background(AppTheme.background)
  }
}

enum DrawerRoute: String, CaseIterable, Identifiable {
  case dashboard, chat, discover, usage, configs, logs
  var id: String { rawValue }
  var title: String { rawValue.capitalized }
  var icon: String {
    switch self {
    case .dashboard: "gauge"
    case .chat: "bubble.left.and.bubble.right"
    case .discover: "sparkles"
    case .usage: "chart.bar"
    case .configs: "slider.horizontal.3"
    case .logs: "list.bullet"
    }
  }
}
