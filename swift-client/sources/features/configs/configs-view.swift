// CRITICAL
import SwiftUI

struct ConfigsView: View {
  @EnvironmentObject private var container: AppContainer
  @EnvironmentObject private var realtime: RealtimeStore
  @EnvironmentObject private var themeManager: ThemeManager
  @StateObject private var model = ConfigsViewModel()
  @State private var showAdd = false

  var body: some View {
    GeometryReader { geo in
      let isWide = geo.size.width >= 980
      ScrollView {
        if isWide {
          HStack(alignment: .top, spacing: 16) {
            VStack(alignment: .leading, spacing: 16) {
              connectionCard
              apiCard
              themeCard
              mcpCard
            }
            .frame(width: 420, alignment: .topLeading)

            VStack(alignment: .leading, spacing: 16) {
              loadState
              servicesCard
              runtimeCard
            }
            .frame(maxWidth: .infinity, alignment: .topLeading)
          }
          .padding(16)
        } else {
          VStack(alignment: .leading, spacing: 16) {
            connectionCard
            apiCard
            themeCard
            loadState
            servicesCard
            runtimeCard
            mcpCard
          }
          .padding(16)
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    .scrollContentBackgroundCompatHidden()
    .background(AppTheme.background)
    .onTapGesture { hideKeyboard() }
    .navigationTitle("Settings")
    .modifier(ConfigsToolbarModifier(model: model))
    .sheet(isPresented: $showAdd) {
      NavigationStack { McpServerEditorView(server: McpServer(id: "", name: "", enabled: true, command: "", args: [], env: [:], description: nil, url: nil)) }
    }
    .onAppear { model.connect(api: container.api) }
    .refreshable { await model.load() }
  }

  @ViewBuilder
  private var themeCard: some View {
    ThemeSelector()
  }

  @ViewBuilder
  private var loadState: some View {
    if model.loading && model.config == nil {
      LoadingView("Loading config…")
    } else if let error = model.error {
      ErrorView(message: error) { Task { await model.load() } }
    }
  }

  @ViewBuilder
  private var servicesCard: some View {
    if let services = model.config?.services {
      CardView {
        VStack(alignment: .leading, spacing: 12) {
          Text("Services").font(AppTheme.sectionFont)
          ConfigsServicesSection(services: services)
        }
      }
    }
  }

  @ViewBuilder
  private var runtimeCard: some View {
    if let runtime = model.config?.runtime {
      CardView {
        VStack(alignment: .leading, spacing: 12) {
          Text("Runtime").font(AppTheme.sectionFont)
          ConfigsRuntimeSection(runtime: runtime, llamaBin: model.config?.config.llamaBin)
        }
      }
    }
  }

  private var mcpCard: some View {
    CardView {
      VStack(alignment: .leading, spacing: 12) {
        HStack {
          Text("MCP Servers").font(AppTheme.sectionFont)
          Spacer()
          Button("Add") { showAdd = true }
            .buttonStyle(.bordered)
        }
        ConfigsMcpSection(
          servers: model.servers,
          onToggle: { server in Task { await model.toggle(server: server) } },
          onDelete: { server in Task { await model.delete(server: server) } }
        )
      }
    }
  }

  private var connectionBadge: (text: String, color: Color) {
    if realtime.isConnected && model.error == nil {
      return ("Connected", AppTheme.success)
    } else if realtime.isConnected && model.error != nil {
      return ("Degraded", AppTheme.warning)
    } else {
      return ("Offline", AppTheme.error)
    }
  }

  private var connectionCard: some View {
    CardView {
      VStack(alignment: .leading, spacing: 10) {
        Text("Controller").font(AppTheme.sectionFont)
        HStack(spacing: 10) {
          BadgeView(text: connectionBadge.text, color: connectionBadge.color)
          Text(container.settings.backendUrl)
            .font(AppTheme.monoFont)
            .foregroundColor(AppTheme.muted)
            .lineLimit(1)
          Spacer()
          Button("Reconnect") {
            realtime.start(api: container.api)
            Task { await model.load() }
          }
          .buttonStyle(.bordered)
        }
      }
    }
  }

  private var apiCard: some View {
    CardView {
      VStack(alignment: .leading, spacing: 12) {
        Text("API Settings").font(AppTheme.sectionFont)
        ConfigsApiSection(settings: container.settings)
        HStack {
          Spacer()
          Button("Apply") {
            container.settings.saveNow()
            realtime.start(api: container.api)
            Task { await model.load() }
          }
          .buttonStyle(.borderedProminent)
          .tint(AppTheme.accentStrong)
        }
      }
    }
  }
}

private struct ConfigsToolbarModifier: ViewModifier {
  @ObservedObject var model: ConfigsViewModel

  func body(content: Content) -> some View {
    #if canImport(UIKit)
    content
      .toolbar {
        ToolbarItemGroup(placement: .topBarTrailing) {
          Button("Refresh") { Task { await model.load() } }
        }
        ToolbarItemGroup(placement: .keyboard) {
          Spacer()
          Button("Done") { dismissKeyboard() }
        }
      }
    #else
    content
      .toolbar {
        ToolbarItemGroup(placement: .primaryAction) {
          Button("Refresh") { Task { await model.load() } }
        }
      }
    #endif
  }
}

private extension View {
  // Avoid per-view OS checks scattered around feature code.
  func scrollContentBackgroundCompatHidden() -> some View {
    if #available(iOS 16.0, *) { return AnyView(self.scrollContentBackground(.hidden)) }
    return AnyView(self)
  }
}
