// CRITICAL
import Foundation
import SwiftUI
import UIKit

struct ToolCallCard: View {
  let call: ToolCall
  @State private var expanded = false

  private var formattedArguments: ToolCallFormatter.Formatted {
    ToolCallFormatter.format(raw: call.function.arguments)
  }

  private var showArgumentsToggle: Bool {
    formattedArguments.text.count > 480
  }

  var body: some View {
    HStack(alignment: .top, spacing: 10) {
      RoundedRectangle(cornerRadius: 1)
        .fill(
          LinearGradient(
            colors: [
              AppTheme.accentStrong.opacity(0.7),
              AppTheme.accent.opacity(0.25),
            ],
            startPoint: .top,
            endPoint: .bottom
          )
        )
        .frame(width: 3)
        .padding(.top, 6)

      VStack(alignment: .leading, spacing: 8) {
        HStack(spacing: 8) {
          Image(systemName: "wrench.and.screwdriver")
            .font(.system(size: 11, weight: .semibold))
            .foregroundColor(AppTheme.muted)
          Text(call.function.name)
            .font(AppTheme.captionFont.weight(.semibold))
            .foregroundColor(AppTheme.foreground)
          Spacer()
          badge(call.type.uppercased(), tone: AppTheme.card, textColor: AppTheme.muted)
        }

        if !call.id.isEmpty {
          Text(call.id)
            .font(AppTheme.captionFont)
            .foregroundColor(AppTheme.muted)
            .lineLimit(1)
            .truncationMode(.middle)
        }

        if !formattedArguments.text.isEmpty {
          HStack(spacing: 6) {
            Text("Arguments")
              .font(AppTheme.captionFont.weight(.semibold))
              .foregroundColor(AppTheme.muted)
            if formattedArguments.isJSON {
              badge("JSON", tone: AppTheme.card.opacity(0.8), textColor: AppTheme.muted)
            }
            Spacer()
            Button(action: {
              UIPasteboard.general.string = formattedArguments.text
              UIImpactFeedbackGenerator(style: .light).impactOccurred()
            }) {
              Image(systemName: "doc.on.doc")
                .font(.system(size: 11, weight: .semibold))
                .foregroundColor(AppTheme.muted)
                .padding(.horizontal, 6)
                .padding(.vertical, 4)
                .background(AppTheme.card.opacity(0.6))
                .cornerRadius(6)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Copy arguments")
            if showArgumentsToggle {
              Button(action: { expanded.toggle() }) {
                HStack(spacing: 4) {
                  Text(expanded ? "Collapse" : "Expand")
                    .font(AppTheme.captionFont.weight(.semibold))
                  Image(systemName: expanded ? "chevron.up" : "chevron.down")
                    .font(.system(size: 10, weight: .semibold))
                }
                .foregroundColor(AppTheme.muted)
              }
              .buttonStyle(.plain)
              .accessibilityLabel(expanded ? "Collapse arguments" : "Expand arguments")
            }
          }
          Text(formattedArguments.text)
            .font(AppTheme.monoFont)
            .foregroundColor(AppTheme.foreground.opacity(0.85))
            .frame(maxWidth: .infinity, alignment: .leading)
            .lineLimit(expanded ? nil : 14)
        } else {
          Text("No arguments")
            .font(AppTheme.captionFont)
            .foregroundColor(AppTheme.muted)
        }
      }
    }
    .padding(10)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(AppTheme.card.opacity(0.85))
    .cornerRadius(10)
    .overlay(
      RoundedRectangle(cornerRadius: 10)
        .stroke(AppTheme.border, lineWidth: 1)
    )
    .textSelection(.enabled)
  }

  private func badge(_ text: String, tone: Color, textColor: Color) -> some View {
    Text(text)
      .font(.system(size: 9, weight: .semibold))
      .foregroundColor(textColor)
      .padding(.horizontal, 6)
      .padding(.vertical, 2)
      .background(tone)
      .cornerRadius(999)
  }
}

struct ToolResultCard: View {
  let result: String
  @State private var expanded = false

  private var formattedResult: ToolCallFormatter.Formatted {
    ToolCallFormatter.format(raw: result)
  }

  private var displayResult: String {
    formattedResult.text.isEmpty ? result : formattedResult.text
  }

  private var showResultToggle: Bool {
    displayResult.count > 480
  }

  var body: some View {
    HStack(alignment: .top, spacing: 10) {
      RoundedRectangle(cornerRadius: 1)
        .fill(
          LinearGradient(
            colors: [
              AppTheme.success.opacity(0.8),
              AppTheme.success.opacity(0.2),
            ],
            startPoint: .top,
            endPoint: .bottom
          )
        )
        .frame(width: 3)
        .padding(.top, 6)

      VStack(alignment: .leading, spacing: 8) {
        HStack(spacing: 6) {
          Text("Result")
            .font(AppTheme.captionFont.weight(.semibold))
            .foregroundColor(AppTheme.muted)
          Spacer()
          Button(action: {
            UIPasteboard.general.string = displayResult
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
          }) {
            Image(systemName: "doc.on.doc")
              .font(.system(size: 11, weight: .semibold))
              .foregroundColor(AppTheme.muted)
              .padding(.horizontal, 6)
              .padding(.vertical, 4)
              .background(AppTheme.card.opacity(0.6))
              .cornerRadius(6)
          }
          .buttonStyle(.plain)
          .accessibilityLabel("Copy result")
          if showResultToggle {
            Button(action: { expanded.toggle() }) {
              HStack(spacing: 4) {
                Text(expanded ? "Collapse" : "Expand")
                  .font(AppTheme.captionFont.weight(.semibold))
                Image(systemName: expanded ? "chevron.up" : "chevron.down")
                  .font(.system(size: 10, weight: .semibold))
              }
              .foregroundColor(AppTheme.muted)
            }
            .buttonStyle(.plain)
            .accessibilityLabel(expanded ? "Collapse result" : "Expand result")
          }
        }

        Text(displayResult)
          .font(AppTheme.monoFont)
          .foregroundColor(AppTheme.foreground.opacity(0.85))
          .frame(maxWidth: .infinity, alignment: .leading)
          .lineLimit(expanded ? nil : 16)
      }
    }
    .padding(10)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(AppTheme.card.opacity(0.85))
    .cornerRadius(10)
    .overlay(
      RoundedRectangle(cornerRadius: 10)
        .stroke(AppTheme.border, lineWidth: 1)
    )
    .textSelection(.enabled)
  }
}

enum ToolCallFormatter {
  struct Formatted {
    let text: String
    let isJSON: Bool
  }

  static func format(raw: String) -> Formatted {
    let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return Formatted(text: "", isJSON: false) }
    guard let data = trimmed.data(using: .utf8) else {
      return Formatted(text: trimmed, isJSON: false)
    }
    guard let json = try? JSONSerialization.jsonObject(with: data) else {
      return Formatted(text: trimmed, isJSON: false)
    }
    if let object = json as? [String: Any] {
      if let pretty = prettyPrinted(object: object) {
        return Formatted(text: pretty, isJSON: true)
      }
    } else if let array = json as? [Any] {
      if let pretty = prettyPrinted(object: array) {
        return Formatted(text: pretty, isJSON: true)
      }
    }
    return Formatted(text: trimmed, isJSON: false)
  }

  private static func prettyPrinted(object: Any) -> String? {
    guard JSONSerialization.isValidJSONObject(object) else { return nil }
    guard let data = try? JSONSerialization.data(withJSONObject: object, options: [.prettyPrinted, .sortedKeys]) else {
      return nil
    }
    return String(data: data, encoding: .utf8)
  }
}
