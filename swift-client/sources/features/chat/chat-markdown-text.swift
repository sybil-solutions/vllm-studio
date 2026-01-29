// CRITICAL
import SwiftUI

struct MarkdownText: View {
  let content: String

  var body: some View {
    let blocks = MarkdownBlockParser.parse(content)
    VStack(alignment: .leading, spacing: 10) {
      ForEach(Array(blocks.enumerated()), id: \.offset) { _, block in
        blockView(block)
      }
    }
    .textSelection(.enabled)
  }

  @ViewBuilder
  private func blockView(_ block: MdBlock) -> some View {
    switch block {
    case .heading(let level, let text):
      headingView(level: level, text: text)
    case .paragraph(let text):
      inlineText(text)
        .font(AppTheme.bodyFont)
        .lineSpacing(4)
        .multilineTextAlignment(.leading)
        .foregroundColor(AppTheme.foreground)
    case .code(let lang, let code):
      codeBlockView(lang: lang, code: code)
    case .bulletList(let items):
      listView(items: items, ordered: false)
    case .orderedList(let items):
      listView(items: items, ordered: true)
    case .blockquote(let text):
      blockquoteView(text: text)
    case .table(let headers, let rows):
      tableView(headers: headers, rows: rows)
    case .rule:
      Divider().background(AppTheme.border)
    case .empty:
      EmptyView()
    }
  }

  // MARK: - Headings

  private func headingView(level: Int, text: String) -> some View {
    let font: Font = switch level {
    case 1: .system(size: 24, weight: .bold)
    case 2: .system(size: 20, weight: .bold)
    case 3: .system(size: 18, weight: .semibold)
    default: .system(size: 16, weight: .semibold)
    }
    return inlineText(text)
      .font(font)
      .foregroundColor(AppTheme.foreground)
      .padding(.top, level <= 2 ? 6 : 2)
  }

  // MARK: - Code block

  private func codeBlockView(lang: String, code: String) -> some View {
    VStack(alignment: .leading, spacing: 0) {
      if !lang.isEmpty {
        Text(lang)
          .font(.system(size: 11, weight: .medium, design: .monospaced))
          .foregroundColor(AppTheme.muted)
          .padding(.horizontal, 12)
          .padding(.top, 8)
          .padding(.bottom, 4)
      }
      Text(code)
        .font(AppTheme.monoFont)
        .foregroundColor(AppTheme.foreground.opacity(0.9))
        .padding(.horizontal, 12)
        .padding(.vertical, lang.isEmpty ? 10 : 6)
        .padding(.bottom, lang.isEmpty ? 0 : 4)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(Color(hex: 0x161514))
    .cornerRadius(8)
    .overlay(RoundedRectangle(cornerRadius: 8).stroke(AppTheme.border, lineWidth: 1))
  }

  // MARK: - Lists

  private func listView(items: [String], ordered: Bool) -> some View {
    VStack(alignment: .leading, spacing: 6) {
      ForEach(Array(items.enumerated()), id: \.offset) { i, item in
        HStack(alignment: .top, spacing: 8) {
          Text(ordered ? "\(i + 1)." : "•")
            .font(AppTheme.bodyFont)
            .foregroundColor(AppTheme.muted)
            .frame(width: 20, alignment: .trailing)
          inlineText(item)
            .font(AppTheme.bodyFont)
            .lineSpacing(4)
            .multilineTextAlignment(.leading)
            .foregroundColor(AppTheme.foreground)
        }
      }
    }
    .padding(.leading, 4)
  }

  // MARK: - Blockquote

  private func blockquoteView(text: String) -> some View {
    HStack(spacing: 0) {
      RoundedRectangle(cornerRadius: 1)
        .fill(AppTheme.border)
        .frame(width: 3)
      inlineText(text)
        .font(AppTheme.bodyFont)
        .lineSpacing(4)
        .multilineTextAlignment(.leading)
        .foregroundColor(AppTheme.muted)
        .padding(.leading, 12)
    }
    .padding(.vertical, 4)
  }

  // MARK: - Table

  private func tableView(headers: [String], rows: [[String]]) -> some View {
    ScrollView(.horizontal, showsIndicators: false) {
      VStack(alignment: .leading, spacing: 0) {
        // Header row
        HStack(spacing: 0) {
          ForEach(headers, id: \.self) { h in
            Text(h)
              .font(AppTheme.captionFont.weight(.semibold))
              .foregroundColor(AppTheme.foreground)
              .padding(.horizontal, 10)
              .padding(.vertical, 8)
              .frame(minWidth: 80, alignment: .leading)
          }
        }
        .background(AppTheme.card)
        Divider().background(AppTheme.border)
        // Data rows
        ForEach(Array(rows.enumerated()), id: \.offset) { _, row in
          HStack(spacing: 0) {
            ForEach(Array(row.enumerated()), id: \.offset) { _, cell in
              Text(cell)
                .font(AppTheme.captionFont)
                .foregroundColor(AppTheme.foreground.opacity(0.85))
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .frame(minWidth: 80, alignment: .leading)
            }
          }
          Divider().background(AppTheme.border)
        }
      }
      .cornerRadius(8)
      .overlay(RoundedRectangle(cornerRadius: 8).stroke(AppTheme.border, lineWidth: 1))
    }
  }

  // MARK: - Inline text (bold, italic, code, links)

  private func inlineText(_ raw: String) -> Text {
    var result = Text("")
    var remaining = raw[raw.startIndex...]

    while !remaining.isEmpty {
      if remaining.hasPrefix("**"), let end = remaining.dropFirst(2).range(of: "**") {
        let inner = remaining[remaining.index(remaining.startIndex, offsetBy: 2)..<end.lowerBound]
        result = result + Text(inner).bold()
        remaining = remaining[end.upperBound...]
      } else if remaining.hasPrefix("*"), let end = remaining.dropFirst(1).range(of: "*") {
        let inner = remaining[remaining.index(after: remaining.startIndex)..<end.lowerBound]
        result = result + Text(inner).italic()
        remaining = remaining[end.upperBound...]
      } else if remaining.hasPrefix("`"), let end = remaining.dropFirst(1).range(of: "`") {
        let inner = remaining[remaining.index(after: remaining.startIndex)..<end.lowerBound]
        result = result + Text(inner)
          .font(.system(size: 14, design: .monospaced))
          .foregroundColor(AppTheme.foreground.opacity(0.8))
        remaining = remaining[end.upperBound...]
      } else if remaining.hasPrefix("["), let cb = remaining.range(of: "]("),
                let pe = remaining[cb.upperBound...].range(of: ")") {
        let label = remaining[remaining.index(after: remaining.startIndex)..<cb.lowerBound]
        let url = remaining[cb.upperBound..<pe.lowerBound]
        if let link = URL(string: String(url)) {
          result = result + Text(.init("[\(label)](\(link.absoluteString))"))
        } else {
          result = result + Text(label)
        }
        remaining = remaining[pe.upperBound...]
      } else {
        result = result + Text(String(remaining.prefix(1)))
        remaining = remaining.dropFirst()
      }
    }
    return result
  }
}

// MARK: - Block parser

enum MdBlock {
  case heading(Int, String)
  case paragraph(String)
  case code(String, String)
  case bulletList([String])
  case orderedList([String])
  case blockquote(String)
  case table([String], [[String]])
  case rule
  case empty
}

enum MarkdownBlockParser {
  static func parse(_ raw: String) -> [MdBlock] {
    let input = raw.replacingOccurrences(of: "\r\n", with: "\n")
    let lines = input.split(separator: "\n", omittingEmptySubsequences: false).map(String.init)
    var blocks: [MdBlock] = []
    var i = 0

    while i < lines.count {
      let line = lines[i]
      let trimmed = line.trimmingCharacters(in: .whitespaces)

      // Empty line
      if trimmed.isEmpty { i += 1; continue }

      // Fenced code block
      if trimmed.hasPrefix("```") {
        let lang = String(trimmed.dropFirst(3)).trimmingCharacters(in: .whitespaces)
        var code: [String] = []
        i += 1
        while i < lines.count {
          if lines[i].trimmingCharacters(in: .whitespaces).hasPrefix("```") { i += 1; break }
          code.append(lines[i])
          i += 1
        }
        blocks.append(.code(lang, code.joined(separator: "\n")))
        continue
      }

      // Heading
      if let m = trimmed.headingMatch() {
        blocks.append(.heading(m.0, m.1))
        i += 1; continue
      }

      // Horizontal rule
      if trimmed.allSatisfy({ $0 == "-" || $0 == "*" || $0 == "_" || $0 == " " }),
         trimmed.filter({ $0 != " " }).count >= 3,
         Set(trimmed.filter({ $0 != " " })).count == 1 {
        blocks.append(.rule)
        i += 1; continue
      }

      // Table (header | sep | rows)
      if trimmed.contains("|"), i + 1 < lines.count,
         lines[i + 1].trimmingCharacters(in: .whitespaces).contains("---") {
        let headers = parseTableRow(trimmed)
        i += 2 // skip header + separator
        var rows: [[String]] = []
        while i < lines.count, lines[i].contains("|") {
          rows.append(parseTableRow(lines[i]))
          i += 1
        }
        blocks.append(.table(headers, rows))
        continue
      }

      // Blockquote
      if trimmed.hasPrefix(">") {
        var quoteLines: [String] = []
        while i < lines.count, lines[i].trimmingCharacters(in: .whitespaces).hasPrefix(">") {
          let stripped = lines[i].trimmingCharacters(in: .whitespaces)
            .replacingOccurrences(of: "^>\\s?", with: "", options: .regularExpression)
          quoteLines.append(stripped)
          i += 1
        }
        blocks.append(.blockquote(quoteLines.joined(separator: " ")))
        continue
      }

      // Bullet list
      if trimmed.hasPrefix("- ") || trimmed.hasPrefix("* ") || trimmed.hasPrefix("+ ") {
        var items: [String] = []
        while i < lines.count {
          let t = lines[i].trimmingCharacters(in: .whitespaces)
          if t.hasPrefix("- ") || t.hasPrefix("* ") || t.hasPrefix("+ ") {
            items.append(String(t.dropFirst(2)))
          } else if t.isEmpty { break }
          else if let last = items.last { items[items.count - 1] = last + " " + t }
          else { break }
          i += 1
        }
        blocks.append(.bulletList(items))
        continue
      }

      // Ordered list
      if trimmed.range(of: "^\\d+[.)] ", options: .regularExpression) != nil {
        var items: [String] = []
        while i < lines.count {
          let t = lines[i].trimmingCharacters(in: .whitespaces)
          if let r = t.range(of: "^\\d+[.)] ", options: .regularExpression) {
            items.append(String(t[r.upperBound...]))
          } else if t.isEmpty { break }
          else if let last = items.last { items[items.count - 1] = last + " " + t }
          else { break }
          i += 1
        }
        blocks.append(.orderedList(items))
        continue
      }

      // Paragraph: gather contiguous non-empty, non-special lines
      var para: [String] = []
      while i < lines.count {
        let t = lines[i].trimmingCharacters(in: .whitespaces)
        if t.isEmpty || t.hasPrefix("```") || t.hasPrefix("#") || t.hasPrefix(">") ||
           t.hasPrefix("- ") || t.hasPrefix("* ") || t.hasPrefix("+ ") ||
           t.range(of: "^\\d+[.)] ", options: .regularExpression) != nil ||
           (t.contains("|") && i + 1 < lines.count && lines[i + 1].contains("---")) { break }
        para.append(lines[i])
        i += 1
      }
      if !para.isEmpty {
        blocks.append(.paragraph(para.joined(separator: " ")))
      }
    }
    return blocks
  }

  private static func parseTableRow(_ line: String) -> [String] {
    line.split(separator: "|").map { $0.trimmingCharacters(in: .whitespaces) }
      .filter { !$0.isEmpty }
  }
}

private extension String {
  func headingMatch() -> (Int, String)? {
    let t = self.trimmingCharacters(in: .whitespaces)
    var level = 0
    for c in t { if c == "#" { level += 1 } else { break } }
    guard level >= 1 && level <= 6, t.count > level, t[t.index(t.startIndex, offsetBy: level)] == " " else { return nil }
    return (level, String(t.dropFirst(level + 1)))
  }
}
