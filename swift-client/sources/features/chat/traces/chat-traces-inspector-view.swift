// CRITICAL
import SwiftUI

struct ChatTracesInspectorView: View {
  @EnvironmentObject private var container: AppContainer
  let sessionId: String
  @StateObject private var model = ChatTracesViewModel()

  var body: some View {
    VStack(spacing: 0) {
      HStack {
        Text("Traces").font(AppTheme.titleFont)
        Spacer()
        Button(action: { Task { await model.load() } }) {
          Image(systemName: "arrow.clockwise")
        }
        .buttonStyle(.plain)
        .foregroundColor(AppTheme.muted)
      }
      .padding(12)
      .background(AppTheme.background)

      Divider()

      List {
        if model.groups.isEmpty, !model.loading {
          Text("No tool calls recorded for this session.")
            .font(AppTheme.bodyFont)
            .foregroundColor(AppTheme.muted)
            .listRowBackground(AppTheme.background)
        }
        ForEach(model.groups) { group in
          Section {
            ForEach(group.calls) { call in
              VStack(alignment: .leading, spacing: 8) {
                HStack {
                  Text(call.functionName).font(AppTheme.sectionFont)
                  Spacer()
                  Text(call.id.prefix(8)).font(AppTheme.captionFont).foregroundColor(AppTheme.muted)
                }
                if !call.arguments.isEmpty {
                  Text(call.arguments)
                    .font(AppTheme.monoFont)
                    .foregroundColor(AppTheme.foreground)
                    .textSelection(.enabled)
                }
                if let result = call.result, !result.isEmpty {
                  Divider()
                  Text(result)
                    .font(AppTheme.monoFont)
                    .foregroundColor(AppTheme.muted)
                    .textSelection(.enabled)
                }
              }
              .padding(.vertical, 6)
              .listRowBackground(AppTheme.background)
            }
          } header: {
            Text(group.title).font(AppTheme.captionFont)
          }
        }
      }
      .listStyle(.plain)
      .scrollContentBackground(.hidden)
      .background(AppTheme.background)
    }
    .onAppear { model.connect(api: container.api, sessionId: sessionId) }
    .overlay(model.loading ? LoadingView() : nil)
    .alert("Error", isPresented: Binding(get: { model.error != nil }, set: { if !$0 { model.error = nil } })) {
      Button("OK", role: .cancel) { model.error = nil }
    } message: {
      Text(model.error ?? "")
    }
  }
}

