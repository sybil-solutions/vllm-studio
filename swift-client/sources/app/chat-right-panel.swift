// CRITICAL
import SwiftUI

struct ChatRightPanel: View {
  let route: DrawerRoute
  let sessionId: String?

  @State private var tab: Tab = .context

  enum Tab: String, CaseIterable, Identifiable {
    case context = "Context"
    case files = "Agent Files"
    case traces = "Traces"
    var id: String { rawValue }
  }

  var body: some View {
    VStack(spacing: 0) {
      header
      Divider()
      panelBody
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(AppTheme.background)
  }

  private var header: some View {
    VStack(spacing: 10) {
      Text("Inspector")
        .font(AppTheme.sectionFont)
        .frame(maxWidth: .infinity, alignment: .leading)
      Picker("Inspector", selection: $tab) {
        ForEach(Tab.allCases) { t in
          Text(t.rawValue).tag(t)
        }
      }
      .pickerStyle(.segmented)
    }
    .padding(12)
    .background(AppTheme.card)
  }

  @ViewBuilder
  private var panelBody: some View {
    if route != .chat {
      VStack(spacing: 10) {
        Spacer()
        Text("Select Chat to inspect").font(AppTheme.bodyFont).foregroundColor(AppTheme.muted)
        Spacer()
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
    } else if let sessionId {
      switch tab {
      case .context:
        ChatInspectorContextView(sessionId: sessionId)
      case .files:
        AgentFilesInspectorView(sessionId: sessionId)
      case .traces:
        ChatTracesInspectorView(sessionId: sessionId)
      }
    } else {
      VStack(spacing: 10) {
        Spacer()
        Text("No chat selected").font(AppTheme.bodyFont).foregroundColor(AppTheme.muted)
        Spacer()
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
  }
}
