import SwiftUI

struct LogsView: View {
  @EnvironmentObject private var container: AppContainer
  @StateObject private var model = LogsViewModel()

  var body: some View {
    List {
      if model.sessions.isEmpty && model.loading {
        ProgressView()
      }
      ForEach(model.sessions) { session in
        NavigationLink {
          LogDetailView(session: session)
        } label: {
          VStack(alignment: .leading, spacing: 4) {
            Text(session.model ?? session.recipeName ?? session.id)
              .font(.headline)
              .foregroundColor(AppTheme.foreground)
            Text(session.createdAt)
              .font(.caption)
              .foregroundColor(AppTheme.muted)
          }
          .padding(.vertical, 6)
        }
      }
    }
    .scrollContentBackground(.hidden)
    .background(AppTheme.background)
    .navigationTitle("Logs")
    .toolbar {
      ToolbarItem(placement: .topBarTrailing) {
        Button("Refresh") {
          Task { await model.load() }
        }
      }
    }
    .onAppear { model.connect(api: container.api) }
  }
}
