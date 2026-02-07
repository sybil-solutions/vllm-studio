// CRITICAL
import SwiftUI

struct ChatInspectorContextView: View {
  let sessionId: String
  @EnvironmentObject private var container: AppContainer
  @StateObject private var model = ChatInspectorContextViewModel()

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 12) {
        CardView {
          VStack(alignment: .leading, spacing: 8) {
            Text("Session").font(AppTheme.titleFont)
            row("Title", value: model.title.isEmpty ? "-" : model.title)
            row("Model", value: model.modelId ?? "Default")
            row("Messages", value: "\(model.messageCount)")
            row("Session ID", value: sessionId)
          }
        }

        CardView {
          VStack(alignment: .leading, spacing: 10) {
            Text("Tools").font(AppTheme.titleFont)
            Toggle("MCP Tools", isOn: $container.settings.mcpEnabled)
            Toggle("Planning", isOn: $container.settings.planModeEnabled)
            row("Voice URL", value: container.settings.voiceUrl)
            row("Voice model", value: container.settings.voiceModel)
          }
        }

        if let usage = model.usage {
          CardView {
            VStack(alignment: .leading, spacing: 8) {
              Text("Usage").font(AppTheme.titleFont)
              row("Prompt", value: "\(usage.promptTokens)")
              row("Completion", value: "\(usage.completionTokens)")
              row("Total", value: "\(usage.totalTokens)")
            }
          }
        }
      }
      .padding(12)
    }
    .background(AppTheme.background)
    .overlay(model.loading ? LoadingView() : nil)
    .onAppear { model.connect(api: container.api, sessionId: sessionId) }
  }

  private func row(_ label: String, value: String) -> some View {
    HStack {
      Text(label).font(AppTheme.captionFont).foregroundColor(AppTheme.muted)
      Spacer()
      Text(value).font(AppTheme.monoFont).foregroundColor(AppTheme.foreground).lineLimit(1)
    }
  }
}

@MainActor
final class ChatInspectorContextViewModel: ObservableObject {
  @Published var loading = false
  @Published var title: String = ""
  @Published var modelId: String?
  @Published var messageCount: Int = 0
  @Published var usage: ChatUsage?

  private var api: ApiClient?
  private var sessionId: String?

  func connect(api: ApiClient, sessionId: String) {
    if self.api == nil { self.api = api }
    self.sessionId = sessionId
    Task { await load() }
  }

  func load() async {
    guard let api, let sessionId else { return }
    loading = true
    defer { loading = false }
    let session = try? await api.getChatSession(id: sessionId)
    title = session?.title ?? ""
    modelId = session?.model
    messageCount = session?.messages.count ?? 0
    usage = try? await api.getChatUsage(sessionId: sessionId)
  }
}
