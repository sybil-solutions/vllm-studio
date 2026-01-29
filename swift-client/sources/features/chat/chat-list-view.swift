// CRITICAL
import SwiftUI

struct ChatListView: View {
  @EnvironmentObject private var container: AppContainer
  @StateObject private var model = ChatListViewModel()
  @State private var selectedSessionId: String?

  var body: some View {
    List {
      ForEach(model.sessions) { session in
        Button {
          selectedSessionId = session.id
        } label: {
          HStack {
            VStack(alignment: .leading, spacing: 4) {
              Text(session.title.isEmpty ? "New chat" : session.title)
                .font(AppTheme.bodyFont.weight(.semibold))
                .lineLimit(1)
              Text(session.updatedAt)
                .font(AppTheme.captionFont)
                .foregroundColor(AppTheme.muted)
            }
            Spacer()
            Image(systemName: "chevron.right")
              .font(.system(size: 13, weight: .medium))
              .foregroundColor(AppTheme.muted.opacity(0.5))
          }
        }
        .buttonStyle(.plain)
        .listRowBackground(AppTheme.card)
      }
      .onDelete { indexSet in
        Task { for index in indexSet { await model.deleteSession(id: model.sessions[index].id) } }
      }
    }
    .listStyle(.plain)
    .scrollContentBackground(.hidden)
    .background(AppTheme.background)
    .overlay(model.loading ? LoadingView() : nil)
    .navigationTitle("Chats")
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      Button("New") { Task { await createSession() } }
    }
    .navigationDestination(item: $selectedSessionId) { sessionId in
      ChatDetailView(sessionId: sessionId)
    }
    .onAppear { model.connect(api: container.api) }
  }

  @MainActor
  private func createSession() async {
    guard let session = await model.createSession() else { return }
    selectedSessionId = session.id
    Task { await model.load() }
  }
}
