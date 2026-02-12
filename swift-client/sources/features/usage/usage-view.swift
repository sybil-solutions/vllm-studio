import SwiftUI

struct UsageView: View {
  @EnvironmentObject private var container: AppContainer
  @StateObject private var model = UsageViewModel()

  var body: some View {
    GeometryReader { geo in
      let isWide = geo.size.width >= 980
      let columns: [GridItem] = isWide ? Array(repeating: GridItem(.flexible(), spacing: 16), count: 2) : [GridItem(.flexible())]

      ScrollView {
        LazyVGrid(columns: columns, alignment: .leading, spacing: 16) {
          if model.loading && model.stats == nil {
            LoadingView("Loading usage…")
              .gridCellColumns(isWide ? 2 : 1)
          } else if let error = model.error {
            ErrorView(message: error) { Task { await model.load() } }
              .gridCellColumns(isWide ? 2 : 1)
          }

          if let totals = model.stats?.totals { UsageSummaryCard(totals: totals) }
          if let latency = model.stats?.latency { UsageLatencyCard(latency: latency, title: "Latency") }
          if let ttft = model.stats?.ttft { UsageLatencyCard(latency: ttft, title: "TTFT") }
          if let tokens = model.stats?.tokensPerRequest { UsageTokensCard(tokens: tokens) }
          if let cache = model.stats?.cache { UsageCacheCard(cache: cache) }
          if let rows = model.stats?.byModel, !rows.isEmpty {
            UsageTopModelsCard(rows: rows)
              .gridCellColumns(isWide ? 2 : 1)
          }
          if let daily = model.stats?.daily, let hourly = model.stats?.hourlyPattern {
            UsageActivityCard(daily: daily, hourly: hourly)
              .gridCellColumns(isWide ? 2 : 1)
          }

          if !model.loading && model.stats == nil && model.error == nil {
            EmptyStateView("No usage yet", systemImage: "chart.bar", message: "Once you start chatting, you'll see tokens and latency here.")
              .gridCellColumns(isWide ? 2 : 1)
              .padding(.top, 40)
          }
        }
        .padding(20)
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    .background(AppTheme.background)
    .navigationTitle("Usage")
    .onAppear { model.connect(api: container.api) }
    .refreshable { await model.load() }
  }
}
