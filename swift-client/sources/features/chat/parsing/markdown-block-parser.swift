// CRITICAL
import Foundation

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

