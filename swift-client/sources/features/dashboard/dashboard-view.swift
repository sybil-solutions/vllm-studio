// CRITICAL
import SwiftUI

struct DashboardView: View {
  @EnvironmentObject private var container: AppContainer
  @EnvironmentObject private var realtime: RealtimeStore
  @StateObject private var model = DashboardViewModel()

  var body: some View {
    GeometryReader { geo in
      let isWide = geo.size.width >= 980
      ScrollView {
        if isWide {
          HStack(alignment: .top, spacing: 16) {
            VStack(alignment: .leading, spacing: 16) {
              primaryCards
            }
            .frame(maxWidth: .infinity, alignment: .topLeading)

            VStack(alignment: .leading, spacing: 16) {
              secondaryCards
            }
            .frame(width: 420, alignment: .topLeading)
          }
          .padding(16)
        } else {
          VStack(alignment: .leading, spacing: 16) {
            primaryCards
            secondaryCards
          }
          .padding(16)
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    .background(AppTheme.background)
    .navigationTitle("Dashboard")
    .onAppear { model.connect(api: container.api) }
    .refreshable { await model.load() }
  }

  private var primaryCards: some View {
    Group {
      if model.loading && model.recipes.isEmpty {
        LoadingView("Loading dashboard…")
      } else if let error = model.error {
        ErrorView(message: error) { Task { await model.load() } }
      }
      DashboardStatusCard(status: realtime.status, connected: realtime.isConnected)
      if let progress = realtime.launchProgress { LaunchProgressCard(progress: progress) }
      GpuStatusSection(gpus: realtime.gpus)
      if let metrics = realtime.metrics { MetricsCard(metrics: metrics) }
      DashboardLogsCard(session: model.logSession, lines: model.logLines)
    }
  }

  private var isRunning: Bool {
    realtime.status?.running == true || realtime.status?.process != nil
  }

  private var secondaryCards: some View {
    Group {
      QuickActionsCard(connected: realtime.isConnected) { Task { await model.benchmark(prompt: 1000, max: 100) } }
      RecipeSection(
        recipes: model.recipes,
        isRunning: isRunning,
        onLaunch: { id in Task { await model.launch(recipeId: id) } },
        onEvict: { Task { await model.evict() } }
      )
      if let benchmark = model.benchmark { BenchmarkCard(result: benchmark) }
    }
  }
}
