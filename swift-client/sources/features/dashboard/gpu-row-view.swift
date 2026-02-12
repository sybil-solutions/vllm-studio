import SwiftUI

struct GpuRowView: View {
  let gpu: GpuInfo

  var body: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(gpu.name)
        .font(AppTheme.bodyFont.weight(.medium))
        .foregroundColor(AppTheme.foreground)
      HStack {
        Text("VRAM")
          .font(AppTheme.captionFont)
          .foregroundColor(AppTheme.muted)
        Spacer()
        Text("\(format(gpu.memoryUsed))/\(format(gpu.memoryTotal)) GB")
          .font(AppTheme.captionFont)
          .foregroundColor(AppTheme.foreground)
      }
      ProgressBar(value: min(1, gpu.memoryUsed / max(gpu.memoryTotal, 1)))
      HStack {
        Text("Utilization")
          .font(AppTheme.captionFont)
          .foregroundColor(AppTheme.muted)
        Spacer()
        Text("\(Int(gpu.utilization))%")
          .font(AppTheme.captionFont)
          .foregroundColor(AppTheme.foreground)
      }
    }
    .padding(.vertical, 4)
  }

  private func format(_ value: Double) -> String {
    String(format: "%.1f", value / 1024 / 1024 / 1024)
  }
}
