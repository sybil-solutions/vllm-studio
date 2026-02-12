import Foundation

/// Format an integer with comma grouping (e.g. 283,573,199).
func formatCount(_ value: Int) -> String {
  let fmt = NumberFormatter()
  fmt.numberStyle = .decimal
  fmt.groupingSeparator = ","
  fmt.locale = Locale(identifier: "en_US")
  return fmt.string(from: NSNumber(value: value)) ?? String(value)
}

/// Format a double as a whole number with comma grouping.
func formatCount(_ value: Double) -> String {
  formatCount(Int(value))
}

/// Format a port number without any grouping separator.
func formatPort(_ port: Int) -> String {
  String(port)
}
