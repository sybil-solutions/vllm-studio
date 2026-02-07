import SwiftUI

struct DiscoverFiltersView: View {
  @Binding var search: String
  @Binding var task: String
  @Binding var sort: String
  @Binding var excludedQuantizations: Set<String>
  let onRefresh: () -> Void
  private let quantTags = ["AWQ", "GPTQ", "GGUF", "EXL2", "FP8", "FP16", "BF16", "INT8", "INT4", "W4A16", "W8A16"]

  var body: some View {
    VStack(spacing: 8) {
      TextField("Search models", text: $search)
        .textFieldStyle(.plain)
        .padding(10)
        .background(AppTheme.card)
        .cornerRadius(10)
      HStack(spacing: 8) {
        TextField("Task", text: $task)
          .textFieldStyle(.plain)
          .padding(10)
          .background(AppTheme.card)
          .cornerRadius(10)
        Picker("Sort", selection: $sort) {
          Text("Trending").tag("trending")
          Text("Downloads").tag("downloads")
          Text("Likes").tag("likes")
          Text("Modified").tag("modified")
        }
        .pickerStyle(.menu)
      }
      Menu {
        ForEach(quantTags, id: \.self) { q in
          Button(action: { toggleQuant(q) }) {
            Label(q, systemImage: excludedQuantizations.contains(q) ? "checkmark.circle.fill" : "circle")
          }
        }
        Divider()
        Button("Clear") { excludedQuantizations.removeAll() }
      } label: {
        Text(excludedQuantizations.isEmpty ? "Hide quantization…" : "Hidden quants: \(excludedQuantizations.count)")
      }
      Button("Refresh", action: onRefresh)
        .buttonStyle(.borderedProminent)
        .tint(AppTheme.accentStrong)
    }
  }

  private func toggleQuant(_ quant: String) {
    if excludedQuantizations.contains(quant) { excludedQuantizations.remove(quant) }
    else { excludedQuantizations.insert(quant) }
  }
}
