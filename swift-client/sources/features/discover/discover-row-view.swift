import SwiftUI

struct DiscoverRowView: View {
  let model: HfModel
  let isLocal: Bool

  var body: some View {
    HStack(alignment: .top, spacing: 12) {
      VStack(alignment: .leading, spacing: 6) {
        Text(model.modelId)
          .font(AppTheme.bodyFont.weight(.medium))
          .foregroundColor(AppTheme.foreground)
          .lineLimit(1)
        if let pipeline = model.pipelineTag, !pipeline.isEmpty {
          Text(pipeline)
            .font(AppTheme.captionFont)
            .foregroundColor(AppTheme.muted)
        }
        HStack(spacing: 8) {
          Image(systemName: "arrow.down.circle")
            .font(.system(size: 10))
          Text(formatCount(model.downloads ?? 0))
        }
        .font(AppTheme.captionFont)
        .foregroundColor(AppTheme.muted)
      }
      Spacer()
      if isLocal {
        BadgeView(text: "Local", color: AppTheme.success)
      }
    }
    .padding(.vertical, 8)
  }
}
