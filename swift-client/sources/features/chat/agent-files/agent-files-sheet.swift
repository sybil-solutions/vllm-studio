import SwiftUI

struct AgentFilesSheet: View {
  let sessionId: String
  @Environment(\.dismiss) private var dismiss

  var body: some View {
    NavigationStack {
      AgentFilesView(sessionId: sessionId)
        .navigationTitle("Agent Files")
        #if canImport(UIKit)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .toolbar { Button("Done") { dismiss() } }
    }
  }
}

