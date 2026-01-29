import SwiftUI

struct ChatProcessingBar: View {
  let startedAt: Date
  let onTap: () -> Void
  @State private var pulse = false

  var body: some View {
    Button(action: onTap) {
      HStack(spacing: 10) {
        Circle()
          .fill(AppTheme.foreground)
          .frame(width: 6, height: 6)
          .opacity(pulse ? 1.0 : 0.3)
          .animation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true), value: pulse)

        TimelineView(.periodic(from: startedAt, by: 1)) { ctx in
          let s = Int(ctx.date.timeIntervalSince(startedAt))
          Text("Thinking • \(s)s")
            .font(AppTheme.captionFont.weight(.medium))
            .foregroundColor(AppTheme.foreground)
        }
        Spacer()
        Image(systemName: "chevron.up")
          .font(.system(size: 11, weight: .medium))
          .foregroundColor(AppTheme.muted)
      }
      .padding(.horizontal, 12)
      .padding(.vertical, 10)
      .background(AppTheme.card)
      .cornerRadius(10)
    }
    .buttonStyle(.plain)
    .onAppear { pulse = true }
  }
}
