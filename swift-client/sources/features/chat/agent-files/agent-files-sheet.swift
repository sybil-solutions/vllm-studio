import SwiftUI

struct AgentFilesSheet: View {
  let sessionId: String
  @Environment(\.dismiss) private var dismiss

  var body: some View {
    NavigationStack {
      AgentFilesView(sessionId: sessionId)
        .navigationTitle("Agent Files")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { Button("Done") { dismiss() } }
    }
  }
}

