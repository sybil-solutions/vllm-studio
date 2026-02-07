// CRITICAL
import SwiftUI

struct DiscoverView: View {
  @EnvironmentObject private var container: AppContainer
  @StateObject private var model = DiscoverViewModel()

  var body: some View {
    VStack(spacing: 12) {
      DiscoverFiltersView(
        search: $model.search,
        task: $model.task,
        sort: $model.sort,
        excludedQuantizations: $model.excludedQuantizations
      ) {
        Task { await model.load() }
      }
      if !model.recommendations.isEmpty {
        CardView {
          VStack(alignment: .leading, spacing: 8) {
            HStack {
              Text("Recommended (VRAM-aware)").font(AppTheme.titleFont)
              Spacer()
              Text(model.maxVramGb > 0 ? "Max VRAM \(String(format: "%.0f", model.maxVramGb)) GB" : "VRAM unknown")
                .font(AppTheme.captionFont)
                .foregroundColor(AppTheme.muted)
            }
            ForEach(Array(model.recommendations.prefix(4))) { rec in
              HStack {
                Text(rec.name).font(AppTheme.bodyFont.weight(.semibold)).lineLimit(1)
                Spacer()
                if let min = rec.minVramGb {
                  Text("min \(String(format: "%.0f", min)) GB")
                    .font(AppTheme.captionFont)
                    .foregroundColor(min <= model.maxVramGb || model.maxVramGb == 0 ? AppTheme.accentStrong : AppTheme.error)
                }
              }
              if rec.id != Array(model.recommendations.prefix(4)).last?.id { Divider() }
            }
          }
        }
      }
      List {
        ForEach(model.filteredModels) { item in
          DiscoverRowView(model: item, isLocal: isLocal(item))
            .listRowBackground(AppTheme.card)
        }
        if model.hasMore {
          Button("Load More") { Task { await model.loadMore() } }
            .listRowBackground(AppTheme.card)
        }
      }
      .listStyle(.plain)
      .scrollContentBackground(.hidden)
      .background(AppTheme.background)
    }
    .padding(12)
    .background(AppTheme.background)
    .navigationTitle("Discover")
    .onAppear { model.connect(api: container.api) }
  }

  private func isLocal(_ modelInfo: HfModel) -> Bool {
    model.localModels.contains { $0.name.lowercased().contains(modelInfo.modelId.lowercased()) }
  }
}
