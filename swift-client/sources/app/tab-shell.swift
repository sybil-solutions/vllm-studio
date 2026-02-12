import SwiftUI

struct TabShell: View {
  var body: some View {
    TabView {
      NavigationStack { DashboardView() }
        .tabItem { Label("Dashboard", systemImage: "gauge") }
      NavigationStack { ChatListView() }
        .tabItem { Label("Chat", systemImage: "bubble.left.and.bubble.right") }
      NavigationStack { RecipesView() }
        .tabItem { Label("Recipes", systemImage: "sparkles") }
      NavigationStack { DiscoverView() }
        .tabItem { Label("Discover", systemImage: "compass") }
      NavigationStack { LogsView() }
        .tabItem { Label("Logs", systemImage: "scroll") }
      NavigationStack { UsageView() }
        .tabItem { Label("Usage", systemImage: "chart.bar") }
      NavigationStack { ConfigsView() }
        .tabItem { Label("Settings", systemImage: "slider.horizontal.3") }
    }
  }
}
