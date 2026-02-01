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
              Text(session.updatedAt.isEmpty ? "Just now" : session.updatedAt)
                .font(AppTheme.captionFont)
                .foregroundColor(AppTheme.muted)
              if let model = session.model, !model.isEmpty {
                Text(model)
                  .font(AppTheme.captionFont)
                  .foregroundColor(AppTheme.foreground.opacity(0.7))
                  .lineLimit(1)
              }
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
    .background(chatBackground)
    .overlay(model.loading ? LoadingView() : nil)
    .navigationTitle("Chats")
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItemGroup(placement: .navigationBarTrailing) {
        if model.creating {
          ProgressView()
        }
        Button("New") { Task { await createSession() } }
          .disabled(model.creating)
      }
    }
    .navigationDestination(item: $selectedSessionId) { sessionId in
      ChatDetailView(sessionId: sessionId)
    }
    .onAppear { model.connect(api: container.api) }
  }

  private var chatBackground: some View {
    LinearGradient(
      colors: [
        AppTheme.background,
        AppTheme.card.opacity(0.3),
        AppTheme.background,
      ],
      startPoint: .topLeading,
      endPoint: .bottomTrailing
    )
    .ignoresSafeArea()
  }


  @MainActor
  private func createSession() async {
    guard let session = await model.createSession() else { return }
    selectedSessionId = session.id
    Task { await model.load() }
  }
}
