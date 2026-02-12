import SwiftUI

struct ConfigsApiSection: View {
  @ObservedObject var settings: SettingsStore

  var body: some View {
    VStack(alignment: .leading, spacing: 16) {
      settingRow("Backend URL", TextField("http://localhost:8000", text: $settings.backendUrl)
        .textFieldStyle(.plain)
        .padding(10)
        .background(AppTheme.cardHover)
        .cornerRadius(10)
      )
      settingRow("API Key", SecureField("Optional", text: $settings.apiKey)
        .textFieldStyle(.plain)
        .padding(10)
        .background(AppTheme.cardHover)
        .cornerRadius(10)
      )
      Toggle("MCP Enabled", isOn: $settings.mcpEnabled)
        .foregroundColor(AppTheme.foreground)
      settingRow("Voice URL", TextField("Optional", text: $settings.voiceUrl)
        .textFieldStyle(.plain)
        .padding(10)
        .background(AppTheme.cardHover)
        .cornerRadius(10)
      )
      settingRow("Voice Model", TextField("", text: $settings.voiceModel)
        .textFieldStyle(.plain)
        .padding(10)
        .background(AppTheme.cardHover)
        .cornerRadius(10)
      )
    }
  }

  @ViewBuilder
  private func settingRow(_ label: String, _ field: some View) -> some View {
    VStack(alignment: .leading, spacing: 6) {
      Text(label)
        .font(AppTheme.captionFont)
        .foregroundColor(AppTheme.muted)
      field
        .foregroundColor(AppTheme.foreground)
    }
  }
}
