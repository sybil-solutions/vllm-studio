// CRITICAL
import SwiftUI

struct AgentFilesView: View {
  @EnvironmentObject private var container: AppContainer
  let sessionId: String
  @StateObject private var model = AgentFilesViewModel()

  @State private var showNewFolder = false
  @State private var newFolderPath = ""
  @State private var showRename = false
  @State private var renameTo = ""

  var body: some View {
    HStack(spacing: 0) {
      fileTree
        .frame(minWidth: 260, idealWidth: 320, maxWidth: 420)
        .background(AppTheme.background)
      Divider()
      fileEditor
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(AppTheme.background)
    }
    .onAppear { model.connect(api: container.api, sessionId: sessionId) }
    .overlay(model.loading ? LoadingView() : nil)
    .alert("Error", isPresented: Binding(get: { model.error != nil }, set: { if !$0 { model.error = nil } })) {
      Button("OK", role: .cancel) { model.error = nil }
    } message: {
      Text(model.error ?? "")
    }
    .alert("New Folder", isPresented: $showNewFolder) {
      TextField("path (e.g. notes)", text: $newFolderPath)
      Button("Create") { Task { await model.createDirectory(path: newFolderPath); newFolderPath = "" } }
      Button("Cancel", role: .cancel) { newFolderPath = "" }
    } message: {
      Text("Create a directory relative to the agent workspace.")
    }
    .alert("Move/Rename", isPresented: $showRename) {
      TextField("new path", text: $renameTo)
      Button("Move") {
        guard let from = model.selectedPath else { return }
        Task { await model.move(from: from, to: renameTo); renameTo = "" }
      }
      Button("Cancel", role: .cancel) { renameTo = "" }
    } message: {
      Text("Move the selected file to a new relative path.")
    }
  }

  private var fileTree: some View {
    VStack(spacing: 0) {
      HStack {
        Text("Agent Files").font(AppTheme.sectionFont)
        Spacer()
        Button(action: { showNewFolder = true }) { Image(systemName: "folder.badge.plus") }
          .buttonStyle(.plain)
          .foregroundColor(AppTheme.muted)
      }
      .padding(12)
      .background(AppTheme.card)

      List {
        OutlineGroup(model.nodes, children: \.children) { node in
          Button {
            if !node.isDirectory { Task { await model.openFile(path: node.id) } }
          } label: {
            HStack(spacing: 8) {
              Image(systemName: node.isDirectory ? "folder" : "doc.text")
                .foregroundColor(node.isDirectory ? AppTheme.accentStrong : AppTheme.muted)
              Text(node.name)
                .foregroundColor(AppTheme.foreground)
              Spacer()
              if !node.isDirectory, let size = node.size {
                Text("\(size)B").font(AppTheme.captionFont).foregroundColor(AppTheme.muted)
              }
            }
          }
          .buttonStyle(.plain)
          .contextMenu {
            Button("Delete", role: .destructive) { Task { await model.delete(path: node.id) } }
          }
          .listRowBackground(AppTheme.background)
        }
      }
      .listStyle(.plain)
      .scrollContentBackground(.hidden)
      .background(AppTheme.background)
    }
  }

  private var fileEditor: some View {
    VStack(spacing: 0) {
      HStack(spacing: 10) {
        Text(model.selectedPath ?? "Select a file")
          .font(AppTheme.captionFont)
          .foregroundColor(AppTheme.muted)
          .lineLimit(1)
        Spacer()
        if model.selectedPath != nil {
          Button("Move") {
            renameTo = model.selectedPath ?? ""
            showRename = true
          }
          .buttonStyle(.bordered)
          Button(role: .destructive) { Task { if let p = model.selectedPath { await model.delete(path: p) } } } label: {
            Image(systemName: "trash")
          }
          .buttonStyle(.bordered)
          Button("Save") { Task { await model.saveSelected() } }
            .buttonStyle(.borderedProminent)
            .tint(model.isDirty ? AppTheme.accentStrong : AppTheme.border)
            .disabled(!model.isDirty)
        }
      }
      .padding(12)
      .background(AppTheme.card)

      if model.selectedPath == nil {
        VStack(spacing: 10) {
          Spacer()
          Text("Browse agent files on the left.").font(AppTheme.bodyFont).foregroundColor(AppTheme.muted)
          Spacer()
        }
      } else {
        TextEditor(text: Binding(
          get: { model.selectedContent },
          set: { model.selectedContent = $0; model.isDirty = true }
        ))
        .font(AppTheme.monoFont)
        .foregroundColor(AppTheme.foreground)
        .scrollContentBackground(.hidden)
        .background(AppTheme.background)
        .padding(12)
      }
    }
  }
}

