import SwiftUI

struct ConfigsMcpSection: View {
  let servers: [McpServer]
  let onToggle: (McpServer) -> Void
  let onDelete: (McpServer) -> Void

  var body: some View {
    VStack(spacing: 10) {
      if servers.isEmpty {
        EmptyStateView("No MCP servers", systemImage: "server.rack", message: "Add a server to enable tool integrations.")
          .padding(.vertical, 8)
      } else {
        ForEach(servers) { server in
          HStack(spacing: 10) {
            NavigationLink {
              McpServerEditorView(server: server)
            } label: {
              VStack(alignment: .leading, spacing: 2) {
                Text(server.name.isEmpty ? "Unnamed server" : server.name)
                  .font(AppTheme.bodyFont.weight(.semibold))
                  .foregroundColor(AppTheme.foreground)
                  .lineLimit(1)
                Text(server.command.isEmpty ? "Command not set" : server.command)
                  .font(AppTheme.captionFont)
                  .foregroundColor(AppTheme.muted)
                  .lineLimit(1)
              }
            }
            Spacer()
            Toggle("", isOn: Binding(
              get: { server.enabled },
              set: { _ in onToggle(server) }
            ))
            .labelsHidden()
            Button(role: .destructive) { onDelete(server) } label: {
              Image(systemName: "trash")
            }
            .buttonStyle(.borderless)
          }
          if server.id != servers.last?.id { Divider() }
        }
      }
    }
  }
}
