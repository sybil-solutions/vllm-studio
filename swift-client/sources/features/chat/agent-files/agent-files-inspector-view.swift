// CRITICAL
import SwiftUI

struct AgentFilesInspectorView: View {
  @EnvironmentObject private var container: AppContainer
  let sessionId: String
  @StateObject private var model = AgentFilesViewModel()

  @State private var showNewFolder = false
  @State private var newFolderPath = ""

  var body: some View {
    VStack(spacing: 0) {
      HStack {
        Text("Agent Files").font(AppTheme.titleFont)
        Spacer()
        Button(action: { Task { await model.reload() } }) { Image(systemName: "arrow.clockwise") }
          .buttonStyle(.plain)
          .foregroundColor(AppTheme.muted)
        Button(action: { showNewFolder = true }) { Image(systemName: "folder.badge.plus") }
          .buttonStyle(.plain)
          .foregroundColor(AppTheme.muted)
      }
      .padding(12)
      .background(AppTheme.background)

      Divider()

      List {
        OutlineGroup(model.nodes, children: \.children) { node in
          Button {
            if !node.isDirectory { Task { await model.openFile(path: node.id) } }
          } label: {
            HStack(spacing: 8) {
              Image(systemName: node.isDirectory ? "folder" : "doc.text")
                .foregroundColor(node.isDirectory ? AppTheme.accentStrong : AppTheme.muted)
              Text(node.name)
                .font(AppTheme.bodyFont)
                .foregroundColor(AppTheme.foreground)
              Spacer()
            }
          }
          .buttonStyle(.plain)
          .contextMenu {
            Button("Delete", role: .destructive) { Task { await model.delete(path: node.id) } }
          }
          .listRowBackground(AppTheme.background)
        }

        if let selectedPath = model.selectedPath {
          Section("Editor") {
            Text(selectedPath).font(AppTheme.captionFont).foregroundColor(AppTheme.muted)
              .listRowBackground(AppTheme.background)
            TextEditor(text: Binding(
              get: { model.selectedContent },
              set: { model.selectedContent = $0; model.isDirty = true }
            ))
            .font(AppTheme.monoFont)
            .frame(minHeight: 220)
            .scrollContentBackground(.hidden)
            .background(AppTheme.card)
            .listRowBackground(AppTheme.background)

            HStack {
              Spacer()
              Button("Save") { Task { await model.saveSelected() } }
                .buttonStyle(.borderedProminent)
                .tint(AppTheme.accentStrong)
                .disabled(!model.isDirty)
            }
            .listRowBackground(AppTheme.background)
          }
        }
      }
      .listStyle(.plain)
      .scrollContentBackground(.hidden)
      .background(AppTheme.background)
    }
    .onAppear { model.connect(api: container.api, sessionId: sessionId) }
    .overlay(model.loading ? LoadingView() : nil)
    .alert("New Folder", isPresented: $showNewFolder) {
      TextField("path (e.g. notes)", text: $newFolderPath)
      Button("Create") { Task { await model.createDirectory(path: newFolderPath); newFolderPath = "" } }
      Button("Cancel", role: .cancel) { newFolderPath = "" }
    } message: {
      Text("Create a directory relative to the agent workspace.")
    }
    .alert("Error", isPresented: Binding(get: { model.error != nil }, set: { if !$0 { model.error = nil } })) {
      Button("OK", role: .cancel) { model.error = nil }
    } message: {
      Text(model.error ?? "")
    }
  }
}

