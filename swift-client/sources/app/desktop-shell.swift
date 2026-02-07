// CRITICAL
import SwiftUI

struct DesktopShell: View {
  @EnvironmentObject private var container: AppContainer

  @State private var route: DrawerRoute = .dashboard
  @State private var selectedChatId: String?
  @State private var columnVisibility: NavigationSplitViewVisibility = .all

  @StateObject private var chats = ChatListViewModel()

  var body: some View {
    NavigationSplitView(columnVisibility: $columnVisibility) {
      sidebar
    } content: {
      contentColumn
    } detail: {
      ChatRightPanel(route: route, sessionId: selectedChatId)
    }
    .navigationSplitViewStyle(.balanced)
    .toolbar {
      ToolbarItem(placement: .navigationBarLeading) {
        Button(action: toggleSidebar) {
          Image(systemName: "sidebar.leading")
        }
      }
    }
    .onAppear { chats.connect(api: container.api) }
  }

  private var sidebar: some View {
    List {
      Section("Navigation") {
        ForEach(DrawerRoute.allCases) { item in
          Button {
            route = item
          } label: {
            HStack(spacing: 10) {
              Image(systemName: item.icon)
              Text(item.title)
              Spacer()
            }
            .foregroundColor(route == item ? AppTheme.foreground : AppTheme.muted)
          }
          .buttonStyle(.plain)
          .listRowBackground(route == item ? AppTheme.card : AppTheme.background)
        }
      }

      if route == .chat {
        Section("Chats") {
          Button("New Chat") { Task { await createChat() } }
            .foregroundColor(AppTheme.accentStrong)
            .listRowBackground(AppTheme.background)
          ForEach(chats.sessions) { session in
            Button {
              selectedChatId = session.id
            } label: {
              VStack(alignment: .leading, spacing: 4) {
                Text(session.title.isEmpty ? "New chat" : session.title)
                  .font(AppTheme.bodyFont.weight(.semibold))
                  .foregroundColor(AppTheme.foreground)
                  .lineLimit(1)
                Text(session.updatedAt)
                  .font(AppTheme.captionFont)
                  .foregroundColor(AppTheme.muted)
              }
            }
            .buttonStyle(.plain)
            .listRowBackground(selectedChatId == session.id ? AppTheme.card : AppTheme.background)
            .contextMenu {
              Button("Delete", role: .destructive) { Task { await chats.deleteSession(id: session.id) } }
            }
          }
        }
      }
    }
    .listStyle(.sidebar)
    .scrollContentBackground(.hidden)
    .background(AppTheme.background)
    .navigationTitle("vLLM Studio")
  }

  @ViewBuilder
  private var contentColumn: some View {
    switch route {
    case .dashboard: DashboardView()
    case .discover: DiscoverView()
    case .usage: UsageView()
    case .configs: ConfigsView()
    case .logs: LogsView()
    case .chat:
      if let selectedChatId {
        ChatDetailView(sessionId: selectedChatId, showsBackButton: false)
      } else {
        VStack(spacing: 10) {
          Spacer()
          Text("Select a chat").font(AppTheme.bodyFont).foregroundColor(AppTheme.muted)
          Button("New Chat") { Task { await createChat() } }
            .buttonStyle(.borderedProminent)
            .tint(AppTheme.accentStrong)
          Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(AppTheme.background)
      }
    }
  }

  private func toggleSidebar() {
    withAnimation(.easeInOut(duration: 0.15)) {
      columnVisibility = (columnVisibility == .all) ? .doubleColumn : .all
    }
  }

  @MainActor
  private func createChat() async {
    guard let created = await chats.createSession() else { return }
    selectedChatId = created.id
    Task { await chats.load() }
  }
}

