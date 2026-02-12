import SwiftUI

struct GpuStatusSection: View {
  let gpus: [GpuInfo]

  var body: some View {
    CardView {
      VStack(alignment: .leading, spacing: 16) {
        Text("GPUs")
          .font(AppTheme.sectionFont)
          .foregroundColor(AppTheme.foreground)
        if gpus.isEmpty {
          Text("No GPUs detected")
            .font(AppTheme.bodyFont)
            .foregroundColor(AppTheme.muted)
            .padding(.vertical, 8)
        } else {
          ForEach(gpus) { gpu in
            GpuRowView(gpu: gpu)
            if gpu.id != gpus.last?.id {
              Divider()
                .background(AppTheme.border)
            }
          }
        }
      }
    }
  }
}
