// CRITICAL
import SwiftUI

#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

struct ArtifactViewerSheet: View {
  let artifact: Artifact
  @State private var showCode = false
  @State private var copied = false
  @Environment(\.dismiss) private var dismiss

  var body: some View {
    NavigationStack {
      ZStack {
        AppTheme.background.ignoresSafeArea()
        if showCode {
          codeView
        } else {
          webViewContent
        }
      }
      .navigationTitle(artifact.title.isEmpty ? artifact.type.label : artifact.title)
      .modifier(ArtifactToolbarModifier(
        onDone: { dismiss() },
        onToggleCode: { showCode.toggle() },
        onCopy: copyCode,
        showCode: showCode,
        copied: copied
      ))
    }
  }

  #if canImport(UIKit)
  private var webViewContent: some View {
    ArtifactWebView(htmlContent: ArtifactTemplates.render(artifact))
      .ignoresSafeArea(edges: .bottom)
  }
  #else
  private var webViewContent: some View {
    ArtifactWebView(htmlContent: ArtifactTemplates.render(artifact))
  }
  #endif

  private var codeView: some View {
    ScrollView {
      Text(artifact.code)
        .font(AppTheme.monoFont)
        .foregroundColor(AppTheme.foreground)
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    .background(AppTheme.card)
  }

  private func copyCode() {
    #if canImport(UIKit)
    UIPasteboard.general.string = artifact.code
    #elseif canImport(AppKit)
    NSPasteboard.general.clearContents()
    NSPasteboard.general.setString(artifact.code, forType: .string)
    #endif
    copied = true
    DispatchQueue.main.asyncAfter(deadline: .now() + 2) { copied = false }
  }
}

private struct ArtifactToolbarModifier: ViewModifier {
  let onDone: () -> Void
  let onToggleCode: () -> Void
  let onCopy: () -> Void
  let showCode: Bool
  let copied: Bool

  func body(content: Content) -> some View {
    #if canImport(UIKit)
    content
      .navigationBarTitleDisplayMode(.inline)
      .toolbarBackground(AppTheme.card, for: .navigationBar)
      .toolbarBackground(.visible, for: .navigationBar)
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button("Done", action: onDone)
            .foregroundColor(AppTheme.accentStrong)
        }
        ToolbarItem(placement: .topBarTrailing) {
          toolbarButtons
        }
      }
    #else
    content
      .toolbar {
        ToolbarItem(placement: .cancellationAction) {
          Button("Done", action: onDone)
            .foregroundColor(AppTheme.accentStrong)
        }
        ToolbarItem(placement: .primaryAction) {
          toolbarButtons
        }
      }
    #endif
  }

  private var toolbarButtons: some View {
    HStack(spacing: 12) {
      Button(action: onToggleCode) {
        Image(systemName: showCode ? "eye" : "chevron.left.forwardslash.chevron.right")
          .font(.system(size: 14))
      }
      .foregroundColor(AppTheme.foreground)

      Button(action: onCopy) {
        Image(systemName: copied ? "checkmark" : "doc.on.doc")
          .font(.system(size: 14))
      }
      .foregroundColor(copied ? AppTheme.success : AppTheme.foreground)

      ShareLink(item: "") {
        Image(systemName: "square.and.arrow.up")
          .font(.system(size: 14))
      }
      .foregroundColor(AppTheme.foreground)
    }
  }
}
