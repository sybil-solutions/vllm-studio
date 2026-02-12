import Combine
import SwiftUI

@main
struct VllmStudioApp: App {
  @StateObject private var container = AppContainer()
  @StateObject private var realtime = RealtimeStore()

  var body: some Scene {
    WindowGroup {
      RootView()
        .environmentObject(container)
        .environmentObject(realtime)
        .onAppear { realtime.start(api: container.api) }
        // Avoid "stuck offline" after changing backend settings.
        .onReceive(container.settings.$backendUrl.dropFirst().debounce(for: .milliseconds(600), scheduler: RunLoop.main)) { _ in
          realtime.start(api: container.api)
        }
        .onReceive(container.settings.$apiKey.dropFirst().debounce(for: .milliseconds(600), scheduler: RunLoop.main)) { _ in
          realtime.start(api: container.api)
        }
    }
  }
}
