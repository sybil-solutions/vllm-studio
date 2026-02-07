import SwiftUI

struct LogDetailView: View {
  let session: LogSession
  @EnvironmentObject private var container: AppContainer
  @StateObject private var model = LogDetailViewModel()

  var body: some View {
    VStack {
      TextEditor(text: $model.content)
        .font(.system(.footnote, design: .monospaced))
        .padding(8)
    }
    .navigationTitle(session.recipeName ?? "Log")
    .onAppear { model.connect(api: container.api, sessionId: session.id) }
    .onDisappear { model.stop() }
  }
}
