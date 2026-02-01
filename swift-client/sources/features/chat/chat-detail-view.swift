// CRITICAL
import SwiftUI
import UIKit

struct ChatDetailView: View {
  let sessionId: String
  @EnvironmentObject private var container: AppContainer
  @Environment(\.dismiss) private var dismiss
  @StateObject private var model = ChatDetailViewModel()
  @State private var attachments: [ChatAttachment] = []
  @State private var showTools = false
  @State private var showMcpSettings = false
  @State private var showContext = false
  @State private var showActionSheet: ChatAgentActions?
  @State private var forkedSessionId: String?
  @State private var traceOpen = false
  @State private var traceDragOffset: CGFloat = 0
  @State private var traceFocusId: String?

  var body: some View {
    GeometryReader { geo in
      let panelWidth = min(360, geo.size.width * 0.86)
      let baseOffset = traceOpen ? 0 : panelWidth
      let panelOffset = min(max(baseOffset + traceDragOffset, 0), panelWidth)
      let backgroundBlur = traceOpen ? 4.0 : 0.0

      ZStack(alignment: .trailing) {
        chatBackground
        mainContent
          .blur(radius: backgroundBlur)

        if traceOpen {
          Color.black.opacity(0.25)
            .ignoresSafeArea()
            .onTapGesture { closeTrace() }
        }

        TracePanel(
          groups: traceGroups,
          focusedId: traceFocusId,
          service: model.openAIService,
          onClose: { closeTrace() }
        )
        .frame(width: panelWidth)
        .offset(x: panelOffset)
        .shadow(color: Color.black.opacity(0.3), radius: 12, x: -4, y: 0)

        if !traceOpen {
          traceHandle
            .padding(.trailing, 6)
            .allowsHitTesting(false)
        }
      }
      .simultaneousGesture(
        DragGesture()
          .onChanged { value in
            let edge: CGFloat = 24
            if !traceOpen {
              if value.startLocation.x > geo.size.width - edge {
                traceDragOffset = min(0, value.translation.width)
              }
            } else {
              traceDragOffset = max(0, value.translation.width)
            }
          }
          .onEnded { value in
            let threshold: CGFloat = 80
            if !traceOpen {
              if value.startLocation.x > geo.size.width - 24 && value.translation.width < -threshold {
                openTrace(focus: traceFocusId)
              }
            } else {
              if value.translation.width > threshold {
                closeTrace()
              }
            }
            traceDragOffset = 0
          }
      )
    }
  }

  private var mainContent: some View {
    ScrollViewReader { proxy in
      ScrollView {
        VStack(spacing: 12) {
          if let modelId = model.sessionModel {
            Text(modelId)
              .font(AppTheme.captionFont)
              .foregroundColor(AppTheme.muted)
              .frame(maxWidth: .infinity, alignment: .leading)
              .padding(.horizontal, 4)
          }

          if hasModeChips {
            HStack(spacing: 8) {
              if container.settings.mcpEnabled {
                modeChip("MCP", icon: "bolt.fill", tone: AppTheme.card, textColor: AppTheme.foreground)
              }
              if container.settings.planModeEnabled {
                modeChip("Plan", icon: "list.bullet.clipboard", tone: AppTheme.card, textColor: AppTheme.foreground)
              }
              if container.settings.deepResearchEnabled {
                modeChip("Research", icon: "globe.americas.fill", tone: AppTheme.card, textColor: AppTheme.foreground)
              }
              Spacer()
            }
            .padding(.horizontal, 4)
          }

          if let plan = model.currentPlan, !plan.isEmpty {
            PlanDrawer(plan: plan, onClear: { model.clearPlan() })
          }

          if let error = model.error {
            VStack(alignment: .leading, spacing: 8) {
              HStack(spacing: 8) {
                Image(systemName: "exclamationmark.triangle.fill")
                Text("Error")
                  .font(AppTheme.sectionFont)
                Spacer()
                Button(action: { model.error = nil }) {
                  Image(systemName: "xmark.circle.fill")
                    .foregroundColor(AppTheme.muted)
                }
              }
              Text(error)
                .font(AppTheme.bodyFont)
            }
            .foregroundColor(AppTheme.error)
            .padding(12)
            .background(AppTheme.error.opacity(0.15))
            .cornerRadius(12)
            .overlay(
              RoundedRectangle(cornerRadius: 12)
                .stroke(AppTheme.error.opacity(0.3), lineWidth: 1)
            )
          }
          // Messages or empty state
          let hasContent = !model.visibleMessages.isEmpty || model.openAIService.isStreaming
          if !hasContent {
            EmptyChatWelcome()
          } else {
            ForEach(model.visibleMessages) { message in
              let actions = message.role == "assistant" ? MessageActionHandlers(
                onCopy: { model.copyMessage(message) },
                onContext: { showContext = true },
                onFork: {
                  Task {
                    if let forked = await model.forkSession(messageId: message.id, title: nil) {
                      forkedSessionId = forked.id
                    }
                  }
                },
                onRetry: {
                  Task {
                    if let forked = await model.forkSession(messageId: message.id, title: "Retry") {
                      forkedSessionId = forked.id
                    }
                  }
                }
              ) : nil
              ChatMessageRow(
                message: message,
                isStreaming: false,
                meta: model.meta(for: message),
                onShowActions: { meta in openActionSheet(message: message, meta: meta) },
                actions: actions
              )
              .equatable()
              .id(message.id)
            }

            // Streaming response appears as the last message
            if model.openAIService.isStreaming {
              ChatStreamingMessageView(
                service: model.openAIService,
                scrollProxy: proxy,
                onShowActions: { meta in openStreamingSheet(meta: meta) }
              )
            }

            if !model.visibleMessages.isEmpty {
              ChatUsageBar(usage: model.chatUsage)
                .padding(.top, 8)
            }
          }
        }
        .padding(16)
        .padding(.bottom, 80)
      }
      .onChange(of: model.messages.count) { _, _ in
        withAnimation(.easeOut(duration: 0.2)) {
          if let last = model.messages.last?.id { proxy.scrollTo(last, anchor: .bottom) }
        }
      }
      .onChange(of: model.openAIService.isStreaming) { _, isStreaming in
        if isStreaming {
          withAnimation(.easeOut(duration: 0.2)) {
            proxy.scrollTo("streaming", anchor: .bottom)
          }
        }
      }
    }
    .safeAreaInset(edge: .bottom) {
      VStack(spacing: 8) {
        if let start = model.openAIService.streamStart, model.openAIService.isStreaming {
          ChatProcessingBar(startedAt: start) {
            openTrace(focus: "streaming")
          }
        }
        ChatToolBelt(
          text: $model.input,
          attachments: $attachments,
          settings: container.settings,
          models: model.availableModels,
          selectedModel: model.sessionModel,
          onModelChange: { modelId in Task { await model.updateModel(modelId) } },
          onSend: { items in Task { await model.sendMessage(attachments: items); attachments = [] } },
          onShowTools: { showTools = true },
          onShowMcpSettings: { showMcpSettings = true },
          isProcessing: model.openAIService.isStreaming
        )
      }
      .padding(.horizontal, 12)
      .padding(.vertical, 8)
      .background(AppTheme.background)
    }
    .background(Color.clear)
    .navigationTitle(model.title.isEmpty ? "Chat" : model.title)
    .navigationBarTitleDisplayMode(.inline)
    .navigationBarBackButtonHidden(true)
    .toolbar {
      ToolbarItem(placement: .navigationBarLeading) {
        Button(action: { dismiss() }) {
          Image(systemName: "chevron.left")
            .font(.system(size: 17, weight: .medium))
            .foregroundColor(AppTheme.foreground)
        }
        .buttonStyle(.plain)
      }
      ToolbarItem(placement: .navigationBarTrailing) {
        Button(action: { openTrace(focus: nil) }) {
          Image(systemName: "sidebar.right")
            .font(.system(size: 15, weight: .semibold))
            .foregroundColor(AppTheme.foreground)
        }
        .accessibilityLabel("Open trace")
      }
    }
    .sheet(isPresented: $showTools) { ChatToolsSheet(tools: model.tools) }
    .sheet(isPresented: $showMcpSettings) {
      NavigationStack { ConfigsView() }
    }
    .sheet(isPresented: $showContext) {
      ChatContextSheet(
        modelId: model.sessionModel,
        messageCount: model.messages.count,
        usage: model.chatUsage,
        toolsEnabled: container.settings.mcpEnabled,
        planEnabled: container.settings.planModeEnabled,
        deepResearchEnabled: container.settings.deepResearchEnabled,
        deepResearchConfig: container.settings.deepResearchConfig
      )
    }
    .sheet(item: $showActionSheet) { actions in
      ChatAgentActionsSheet(actions: actions, service: model.openAIService)
    }
    .navigationDestination(isPresented: Binding(
      get: { forkedSessionId != nil },
      set: { if !$0 { forkedSessionId = nil } }
    )) {
      if let forkedSessionId { ChatDetailView(sessionId: forkedSessionId) }
    }
    .onAppear { model.connect(api: container.api, settings: container.settings, sessionId: sessionId) }
  }

  private func openActionSheet(message: StoredMessage, meta: AgentMeta) {
    let title = message.role == "assistant" ? "Assistant Trace" : "Trace"
    showActionSheet = ChatAgentActions(
      id: message.id,
      title: title,
      meta: meta,
      startedAt: parseDate(message.createdAt),
      isStreaming: false
    )
  }

  private func openStreamingSheet(meta: AgentMeta) {
    showActionSheet = ChatAgentActions(
      id: "streaming",
      title: "Streaming Trace",
      meta: meta,
      startedAt: model.openAIService.streamStart,
      isStreaming: true
    )
  }

  private func parseDate(_ raw: String?) -> Date? {
    guard let raw, !raw.isEmpty else { return nil }
    return ISO8601DateFormatter().date(from: raw)
  }

  private func tracePreview(for message: StoredMessage) -> String {
    let content = model.cleanedContent(for: message)
    let trimmed = content.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty else { return "" }
    let limit = 240
    if trimmed.count <= limit { return trimmed }
    return String(trimmed.prefix(limit)) + "..."
  }

  private func tokenLine(for stats: TraceTokenStats?) -> String? {
    guard let stats else { return nil }
    if stats.prompt == nil && stats.tools == nil && stats.completion == nil && stats.total == nil { return nil }
    var parts: [String] = []
    if let prompt = stats.prompt { parts.append("prompt \(prompt)") }
    if let tools = stats.tools { parts.append("tools \(tools)") }
    if let completion = stats.completion { parts.append("completion \(completion)") }
    if let total = stats.total { parts.append("total \(total)") }
    return parts.joined(separator: " · ")
  }

  private var chatBackground: some View {
    LinearGradient(
      colors: [
        AppTheme.background,
        AppTheme.card.opacity(0.35),
        AppTheme.background,
      ],
      startPoint: .topLeading,
      endPoint: .bottomTrailing
    )
    .ignoresSafeArea()
  }

  private var hasModeChips: Bool {
    container.settings.mcpEnabled || container.settings.planModeEnabled || container.settings.deepResearchEnabled
  }

  private var traceGroups: [TraceGroup] {
    var groups: [TraceGroup] = []
    let assistants = model.messages.filter { $0.role == "assistant" }
    for (idx, message) in assistants.enumerated() {
      guard let meta = model.meta(for: message) else { continue }
      let title = "Assistant \(idx + 1)"
      let stats = TraceTokenStats(
        prompt: message.requestPromptTokens,
        tools: message.requestToolsTokens,
        completion: message.requestCompletionTokens
      )
      let context = TraceContext(
        preview: tracePreview(for: message),
        modelId: message.model,
        timestamp: parseDate(message.createdAt),
        tokenLine: tokenLine(for: stats),
        tokenStats: stats
      )
      groups.append(TraceGroup(id: message.id, title: title, meta: meta, context: context))
    }
    return groups
  }

  private func openTrace(focus: String?) {
    traceFocusId = focus
    traceDragOffset = 0
    UIImpactFeedbackGenerator(style: .light).impactOccurred()
    withAnimation(.spring(response: 0.32, dampingFraction: 0.86)) { traceOpen = true }
  }

  private func closeTrace() {
    traceDragOffset = 0
    withAnimation(.spring(response: 0.32, dampingFraction: 0.86)) { traceOpen = false }
    traceFocusId = nil
  }

  private var traceHandle: some View {
    VStack {
      Spacer()
      Capsule()
        .fill(AppTheme.border.opacity(0.8))
        .frame(width: 4, height: 56)
        .overlay(
          Capsule()
            .fill(AppTheme.accentStrong.opacity(0.35))
            .frame(width: 4, height: 24)
        )
      Spacer()
    }
  }

  private func modeChip(_ text: String, icon: String, tone: Color, textColor: Color) -> some View {
    HStack(spacing: 6) {
      Image(systemName: icon).font(.system(size: 10, weight: .semibold))
      Text(text).font(AppTheme.captionFont.weight(.semibold))
    }
    .foregroundColor(textColor)
    .padding(.horizontal, 10)
    .padding(.vertical, 6)
    .background(tone)
    .cornerRadius(999)
    .overlay(
      RoundedRectangle(cornerRadius: 999)
        .stroke(AppTheme.border, lineWidth: 1)
    )
  }
}

private struct EmptyChatWelcome: View {
  var body: some View {
    VStack(spacing: 16) {
      Spacer().frame(height: 60)
      Image(systemName: "bubble.left.and.bubble.right")
        .font(.system(size: 32, weight: .light))
        .foregroundColor(AppTheme.muted.opacity(0.5))
      Text("New conversation")
        .font(AppTheme.sectionFont)
        .foregroundColor(AppTheme.foreground)
      Text("Ask a question or drop a file to get started.")
        .font(AppTheme.captionFont)
        .foregroundColor(AppTheme.muted)
        .multilineTextAlignment(.center)
        .padding(.horizontal, 24)
      VStack(spacing: 8) {
        HStack(spacing: 8) {
          suggestionChip("Summarize this codebase")
          suggestionChip("Draft a plan")
        }
        HStack(spacing: 8) {
          suggestionChip("Find regressions")
          suggestionChip("Explain tool output")
        }
      }
      Spacer()
    }
    .frame(maxWidth: .infinity)
  }

  private func suggestionChip(_ text: String) -> some View {
    Text(text)
      .font(AppTheme.captionFont.weight(.semibold))
      .foregroundColor(AppTheme.foreground.opacity(0.9))
      .padding(.horizontal, 12)
      .padding(.vertical, 6)
      .background(AppTheme.card)
      .cornerRadius(999)
      .overlay(
        RoundedRectangle(cornerRadius: 999)
          .stroke(AppTheme.border, lineWidth: 1)
      )
  }
}

private struct ChatContextSheet: View {
  let modelId: String?
  let messageCount: Int
  let usage: ChatUsage?
  let toolsEnabled: Bool
  let planEnabled: Bool
  let deepResearchEnabled: Bool
  let deepResearchConfig: DeepResearchConfig
  @Environment(\.dismiss) private var dismiss

  var body: some View {
    NavigationStack {
      List {
        section("Model", value: modelId ?? "Default")
        section("Messages", value: "\(messageCount)")
        section("Tools", value: toolsEnabled ? "Enabled" : "Disabled")
        section("Planning", value: planEnabled ? "Enabled" : "Disabled")
        section("Deep research", value: deepResearchEnabled ? "Enabled" : "Disabled")
        if deepResearchEnabled {
          section("Depth", value: deepResearchConfig.depth.label)
          section("Max sources", value: "\(deepResearchConfig.maxSources)")
          section("Citations", value: deepResearchConfig.includeCitations ? "On" : "Off")
        }
        if let usage {
          section("Prompt tokens", value: "\(usage.promptTokens)")
          section("Completion tokens", value: "\(usage.completionTokens)")
          section("Total tokens", value: "\(usage.totalTokens)")
        }
      }
      .listStyle(.plain)
      .scrollContentBackground(.hidden)
      .background(AppTheme.background)
      .navigationTitle("Context")
      .toolbar { Button("Done") { dismiss() } }
    }
  }

  private func section(_ title: String, value: String) -> some View {
    HStack {
      Text(title).font(AppTheme.captionFont).foregroundColor(AppTheme.muted)
      Spacer()
      Text(value).font(AppTheme.bodyFont).foregroundColor(AppTheme.foreground)
    }
    .listRowBackground(AppTheme.card)
  }
}

private struct PlanDrawer: View {
  let plan: [PlanTask]
  let onClear: () -> Void
  @State private var collapsed = false

  var body: some View {
    HStack(alignment: .top, spacing: 12) {
      RoundedRectangle(cornerRadius: 1)
        .fill(
          LinearGradient(
            colors: [
              AppTheme.warning.opacity(0.8),
              AppTheme.accentStrong.opacity(0.35),
            ],
            startPoint: .top,
            endPoint: .bottom
          )
        )
        .frame(width: 3)
        .padding(.top, 8)

      VStack(spacing: 10) {
        Button(action: { withAnimation(.easeInOut(duration: 0.2)) { collapsed.toggle() } }) {
          HStack(spacing: 8) {
            Image(systemName: collapsed ? "chevron.right" : "chevron.down")
              .font(.system(size: 11, weight: .semibold))
            Image(systemName: "list.bullet.clipboard")
              .font(.system(size: 12, weight: .semibold))
              .foregroundColor(AppTheme.accentStrong)
            Text("Plan")
              .font(AppTheme.captionFont.weight(.semibold))
              .foregroundColor(AppTheme.muted)
            Text(progressText)
              .font(AppTheme.monoFont)
              .foregroundColor(AppTheme.foreground.opacity(0.7))
            Spacer()
            Button(action: onClear) {
              Image(systemName: "xmark.circle.fill")
                .foregroundColor(AppTheme.muted)
            }
            .buttonStyle(.plain)
          }
        }
        .buttonStyle(.plain)

        progressBar

        if !collapsed {
          VStack(spacing: 6) {
            ForEach(plan) { task in
              HStack(spacing: 8) {
                statusIcon(task.status)
                Text(task.title)
                  .font(AppTheme.captionFont)
                  .foregroundColor(task.status == .done ? AppTheme.muted : AppTheme.foreground)
                  .lineLimit(2)
                Spacer()
              }
              .padding(.horizontal, 8)
              .padding(.vertical, 6)
              .background(task.status == .inProgress ? AppTheme.card.opacity(0.9) : AppTheme.card.opacity(0.6))
              .cornerRadius(8)
            }
          }
        }
      }
    }
    .padding(12)
    .background(
      LinearGradient(
        colors: [AppTheme.card, AppTheme.card.opacity(0.7)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      )
    )
    .cornerRadius(12)
    .overlay(
      RoundedRectangle(cornerRadius: 12)
        .stroke(AppTheme.border, lineWidth: 1)
    )
  }

  private var progressText: String {
    let done = plan.filter { $0.status == .done }.count
    return "\(done)/\(plan.count) steps"
  }

  private var progressValue: Double {
    guard !plan.isEmpty else { return 0 }
    let done = plan.filter { $0.status == .done }.count
    return Double(done) / Double(plan.count)
  }

  private var progressBar: some View {
    GeometryReader { proxy in
      let width = proxy.size.width
      ZStack(alignment: .leading) {
        Capsule()
          .fill(AppTheme.border)
        Capsule()
          .fill(AppTheme.accentStrong)
          .frame(width: max(6, width * progressValue))
      }
    }
    .frame(height: 6)
    .accessibilityLabel("Plan progress")
    .accessibilityValue(progressText)
  }

  private func statusIcon(_ status: PlanTask.Status) -> some View {
    let name: String
    let color: Color
    switch status {
    case .done:
      name = "checkmark.circle.fill"
      color = AppTheme.success
    case .inProgress:
      name = "circle.dashed"
      color = AppTheme.warning
    case .pending:
      name = "circle"
      color = AppTheme.muted
    }
    return Image(systemName: name)
      .font(.system(size: 12, weight: .semibold))
      .foregroundColor(color)
  }
}

private struct TraceContext {
  let preview: String
  let modelId: String?
  let timestamp: Date?
  let tokenLine: String?
  let tokenStats: TraceTokenStats?
}

private struct TraceTokenStats {
  let prompt: Int?
  let tools: Int?
  let completion: Int?

  var total: Int? {
    let sum = [prompt, tools, completion].compactMap { $0 }.reduce(0, +)
    return sum > 0 ? sum : nil
  }
}

private struct TraceGroup: Identifiable {
  let id: String
  let title: String
  let meta: AgentMeta
  let context: TraceContext
}

private struct TracePanel: View {
  let groups: [TraceGroup]
  let focusedId: String?
  @ObservedObject var service: OpenAIChatService
  let onClose: () -> Void
  @State private var pulse = false
  @State private var resultPulse = false
  @State private var highlightedResultId: String?
  @State private var lastResultCount = 0

  var body: some View {
    ScrollViewReader { proxy in
      VStack(spacing: 0) {
        HStack {
          Text("Trace")
            .font(AppTheme.sectionFont)
            .foregroundColor(AppTheme.foreground)
        if service.isStreaming {
          HStack(spacing: 6) {
            Circle()
              .fill(AppTheme.success)
              .frame(width: 6, height: 6)
              .opacity(pulse ? 1 : 0.4)
            Text("Live")
              .font(AppTheme.captionFont.weight(.semibold))
              .foregroundColor(AppTheme.success)
          }
          .padding(.leading, 6)
          .onAppear {
            withAnimation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true)) {
              pulse = true
            }
          }
          if latestResultCount > 0 {
            summaryChip(label: "New results", value: "\(latestResultCount)")
              .scaleEffect(resultPulse ? 1.08 : 1)
              .animation(.spring(response: 0.25, dampingFraction: 0.6), value: resultPulse)
          }
          if let liveMeta = streamingMeta, !liveMeta.toolCalls.isEmpty {
            summaryChip(label: "Tools", value: "\(liveMeta.toolCalls.count)")
          }
        }
        Spacer()
          if hasTraceItems {
            Button(action: { scrollToLatest(proxy: proxy) }) {
              HStack(spacing: 4) {
                Image(systemName: "arrow.down.to.line")
                  .font(.system(size: 10, weight: .semibold))
                Text("Latest")
                  .font(AppTheme.captionFont.weight(.semibold))
              }
              .foregroundColor(AppTheme.muted)
              .padding(.horizontal, 8)
              .padding(.vertical, 4)
              .background(AppTheme.card)
              .cornerRadius(999)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Jump to latest trace")
          }
          if service.isStreaming, let start = service.streamStart {
            TimelineView(.periodic(from: start, by: 1)) { ctx in
              let elapsed = Int(ctx.date.timeIntervalSince(start))
              summaryChip(label: "Running", value: "\(elapsed)s")
            }
          }
          Button(action: onClose) {
            Image(systemName: "xmark")
              .font(.system(size: 12, weight: .semibold))
              .foregroundColor(AppTheme.muted)
              .padding(6)
              .background(AppTheme.card)
              .cornerRadius(8)
          }
          .buttonStyle(.plain)
          .accessibilityLabel("Close trace")
        }
        .padding(12)
        .background(AppTheme.background)

        if !summaryItems.isEmpty {
          HStack(spacing: 8) {
            ForEach(summaryItems, id: \.label) { item in
              summaryChip(label: item.label, value: item.value)
            }
            Spacer()
          }
          .padding(.horizontal, 12)
          .padding(.bottom, 8)
          .background(AppTheme.background)
        }

        if let audit = auditSummary {
          HStack(spacing: 8) {
            summaryChip(label: "Duration", value: durationLabel(audit.duration))
            if let tokens = audit.totalTokens {
              summaryChip(label: "Tokens", value: "\(tokens)")
            }
            Spacer()
          }
          .padding(.horizontal, 12)
          .padding(.bottom, 8)
          .background(AppTheme.background)
        }

        ScrollView {
          VStack(alignment: .leading, spacing: 12) {
            if let liveMeta = streamingMeta {
              traceGroupCard(
                title: "Live",
                meta: liveMeta,
                isFocused: focusedId == "streaming",
                context: nil
              )
              .id("streaming")
              if !groups.isEmpty {
                Divider()
                  .background(AppTheme.border)
                  .padding(.vertical, 4)
              }
            }

            ForEach(Array(groups.enumerated()), id: \.element.id) { idx, group in
              traceGroupCard(
                title: group.title,
                meta: group.meta,
                isFocused: focusedId == group.id,
                context: group.context
              )
              .id(group.id)
              .transition(.opacity.combined(with: .move(edge: .trailing)))
              .animation(
                .easeOut(duration: 0.25).delay(Double(idx) * 0.03),
                value: groups.count
              )
              if idx < groups.count - 1 {
                Divider()
                  .background(AppTheme.border)
                  .padding(.vertical, 4)
              }
            }

            if groups.isEmpty && streamingMeta == nil {
              Text("No trace data yet.")
                .font(AppTheme.bodyFont)
                .foregroundColor(AppTheme.muted)
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.vertical, 40)
            }
          }
          .padding(12)
        }
        .background(AppTheme.background)
        .onChange(of: focusedId) { _, newId in
          guard let newId else { return }
          withAnimation(.easeInOut(duration: 0.2)) {
            proxy.scrollTo(newId, anchor: .top)
          }
        }
      }
    }
    .onChange(of: latestResultCount) { _, newValue in
      guard newValue > 0 else { return }
      if newValue > lastResultCount {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
      }
      lastResultCount = newValue
      resultPulse = true
      if let id = latestResultId {
        highlightedResultId = id
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
          if highlightedResultId == id { highlightedResultId = nil }
        }
      }
      DispatchQueue.main.asyncAfter(deadline: .now() + 0.18) {
        resultPulse = false
      }
    }
    .background(AppTheme.background)
    .cornerRadius(16)
    .overlay(
      RoundedRectangle(cornerRadius: 16)
        .stroke(AppTheme.border, lineWidth: 1)
    )
  }

  private var streamingMeta: AgentMeta? {
    let reasoning = service.streamingReasoning.trimmingCharacters(in: .whitespacesAndNewlines)
    let tools = service.streamingToolCalls
    if reasoning.isEmpty && tools.isEmpty { return nil }
    return AgentMeta(
      thinkingBlocks: reasoning.isEmpty ? [] : [reasoning],
      toolCalls: tools,
      toolResults: []
    )
  }

  private var hasTraceItems: Bool {
    streamingMeta != nil || !groups.isEmpty
  }

  private var latestResultCount: Int {
    guard let latest = groups.last else { return 0 }
    return latest.meta.toolResults.filter {
      !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }.count
  }

  private var latestResultId: String? {
    guard let latest = groups.last else { return nil }
    for (idx, call) in latest.meta.toolCalls.enumerated().reversed() {
      guard idx < latest.meta.toolResults.count else { continue }
      let result = latest.meta.toolResults[idx].trimmingCharacters(in: .whitespacesAndNewlines)
      if !result.isEmpty { return call.id }
    }
    return nil
  }

  private func scrollToLatest(proxy: ScrollViewProxy) {
    if streamingMeta != nil {
      withAnimation(.easeOut(duration: 0.2)) {
        proxy.scrollTo("streaming", anchor: .top)
      }
      return
    }
    if let last = groups.last {
      withAnimation(.easeOut(duration: 0.2)) {
        proxy.scrollTo(last.id, anchor: .top)
      }
    }
  }

  private var summaryItems: [SummaryItem] {
    let live = streamingMeta
    let messageCount = groups.count + (live == nil ? 0 : 1)
    let toolCount = groups.reduce(0) { $0 + $1.meta.toolCalls.count } + (live?.toolCalls.count ?? 0)
    let reasoningCount = groups.reduce(0) { $0 + $1.meta.thinkingBlocks.count } + (live?.thinkingBlocks.count ?? 0)

    var items: [SummaryItem] = []
    if messageCount > 0 { items.append(SummaryItem(label: "Messages", value: "\(messageCount)")) }
    if toolCount > 0 { items.append(SummaryItem(label: "Tools", value: "\(toolCount)")) }
    if reasoningCount > 0 { items.append(SummaryItem(label: "Reasoning", value: "\(reasoningCount)")) }
    return items
  }

  private var auditSummary: AuditSummary? {
    var timestamps: [Date] = groups.compactMap { $0.context.timestamp }
    if let start = service.streamStart { timestamps.append(start) }
    let minDate = timestamps.min()
    let maxDate = timestamps.max()
    let duration = (minDate != nil && maxDate != nil) ? maxDate!.timeIntervalSince(minDate!) : 0

    var prompt = 0
    var tools = 0
    var completion = 0
    var hasTokens = false
    for group in groups {
      if let stats = group.context.tokenStats {
        if let value = stats.prompt { prompt += value; hasTokens = true }
        if let value = stats.tools { tools += value; hasTokens = true }
        if let value = stats.completion { completion += value; hasTokens = true }
      }
    }

    if duration <= 0 && !hasTokens { return nil }
    return AuditSummary(
      duration: duration,
      totalTokens: hasTokens ? (prompt + tools + completion) : nil
    )
  }

  @ViewBuilder
  private func traceGroupCard(title: String, meta: AgentMeta, isFocused: Bool, context: TraceContext?) -> some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(spacing: 8) {
        Image(systemName: "sparkles")
          .font(.system(size: 10, weight: .semibold))
          .foregroundColor(AppTheme.muted)
        Text(title)
          .font(AppTheme.captionFont.weight(.semibold))
          .foregroundColor(AppTheme.muted)
        Spacer()
        if isFocused {
          Text("Focused")
            .font(AppTheme.captionFont.weight(.semibold))
            .foregroundColor(AppTheme.accentStrong)
        }
      }

      if title == "Live" {
        HStack(spacing: 8) {
          if !meta.thinkingBlocks.isEmpty {
            statChip(label: "Reasoning", value: "\(meta.thinkingBlocks.count)")
          }
          if !meta.toolCalls.isEmpty {
            statChip(label: "Tools", value: "\(meta.toolCalls.count)")
          }
          Spacer()
        }
      }

      if let context {
        let metaRows = metadataRows(for: context)
        if !metaRows.isEmpty {
          sectionLabel("Meta")
          VStack(alignment: .leading, spacing: 4) {
            ForEach(metaRows, id: \.label) { row in
              metaRow(label: row.label, value: row.value)
            }
          }
        }

        if !context.preview.isEmpty {
          sectionLabel("Message")
          Text(context.preview)
            .font(AppTheme.bodyFont)
            .foregroundColor(AppTheme.foreground)
            .lineLimit(4)
            .padding(10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AppTheme.card)
            .cornerRadius(8)
        }
      }

      if !meta.thinkingBlocks.isEmpty {
        sectionLabel("Reasoning")
        ForEach(meta.thinkingBlocks, id: \.self) { block in
          Text(block)
            .font(AppTheme.monoFont)
            .foregroundColor(AppTheme.foreground.opacity(0.85))
            .padding(10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(AppTheme.card)
            .cornerRadius(8)
        }
      }

      if !meta.toolCalls.isEmpty {
        sectionLabel("Tool timeline")
        ForEach(Array(meta.toolCalls.enumerated()), id: \.element.id) { idx, call in
          VStack(alignment: .leading, spacing: 8) {
            ToolCallCard(call: call)
            if idx < meta.toolResults.count {
              let result = meta.toolResults[idx].trimmingCharacters(in: .whitespacesAndNewlines)
              if !result.isEmpty {
                ToolResultCard(result: result)
                  .background(
                    RoundedRectangle(cornerRadius: 10)
                      .fill(AppTheme.accentStrong.opacity(highlightedResultId == call.id ? 0.12 : 0))
                  )
                  .overlay(
                    RoundedRectangle(cornerRadius: 10)
                      .stroke(AppTheme.accentStrong.opacity(highlightedResultId == call.id ? 0.8 : 0), lineWidth: 2)
                  )
                  .animation(.easeOut(duration: 0.3), value: highlightedResultId)
              }
            }
          }
        }
      }

      if meta.toolResults.count > meta.toolCalls.count {
        sectionLabel("Additional results")
        ForEach(Array(meta.toolResults.dropFirst(meta.toolCalls.count).enumerated()), id: \.offset) { _, result in
          let trimmed = result.trimmingCharacters(in: .whitespacesAndNewlines)
          if !trimmed.isEmpty {
            ToolResultCard(result: trimmed)
          }
        }
      }

      if title == "Live" {
        HStack(spacing: 6) {
          Image(systemName: "dot.radiowaves.left.and.right")
            .font(.system(size: 10, weight: .semibold))
          Text("Now")
            .font(AppTheme.captionFont.weight(.semibold))
        }
        .foregroundColor(AppTheme.success)
        .padding(.top, 2)
      }
    }
    .padding(12)
    .background(isFocused ? AppTheme.card.opacity(0.9) : AppTheme.card.opacity(0.6))
    .cornerRadius(12)
    .overlay(
      RoundedRectangle(cornerRadius: 12)
        .stroke(isFocused ? AppTheme.accentStrong.opacity(0.5) : AppTheme.border, lineWidth: 1)
    )
  }

  private func sectionLabel(_ text: String) -> some View {
    Text(text)
      .font(AppTheme.captionFont.weight(.semibold))
      .foregroundColor(AppTheme.muted)
  }

  private struct SummaryItem {
    let label: String
    let value: String
  }

  private struct AuditSummary {
    let duration: TimeInterval
    let totalTokens: Int?
  }

  private func summaryChip(label: String, value: String) -> some View {
    HStack(spacing: 4) {
      Text(label)
        .font(AppTheme.captionFont.weight(.semibold))
      Text(value)
        .font(AppTheme.monoFont)
    }
    .foregroundColor(AppTheme.muted)
    .padding(.horizontal, 8)
    .padding(.vertical, 4)
    .background(AppTheme.card)
    .cornerRadius(999)
  }

  private func durationLabel(_ seconds: TimeInterval) -> String {
    let total = max(0, Int(seconds))
    let hours = total / 3600
    let minutes = (total % 3600) / 60
    let secs = total % 60
    if hours > 0 { return "\(hours)h \(String(format: "%02dm", minutes))" }
    if minutes > 0 { return "\(minutes)m \(String(format: "%02ds", secs))" }
    return "\(secs)s"
  }

  private struct MetadataRow {
    let label: String
    let value: String
  }

  private func metadataRows(for context: TraceContext) -> [MetadataRow] {
    var rows: [MetadataRow] = []
    if let modelId = context.modelId, !modelId.isEmpty {
      rows.append(MetadataRow(label: "Model", value: modelId))
    }
    if let timestamp = context.timestamp {
      rows.append(MetadataRow(label: "Time", value: TracePanel.timeFormatter.string(from: timestamp)))
    }
    if let tokenLine = context.tokenLine, !tokenLine.isEmpty {
      rows.append(MetadataRow(label: "Tokens", value: tokenLine))
    }
    return rows
  }

  private func metaRow(label: String, value: String) -> some View {
    HStack(spacing: 8) {
      Text(label)
        .font(AppTheme.captionFont)
        .foregroundColor(AppTheme.muted)
        .frame(width: 64, alignment: .leading)
      Text(value)
        .font(AppTheme.captionFont)
        .foregroundColor(AppTheme.foreground)
    }
  }

  private func statChip(label: String, value: String) -> some View {
    HStack(spacing: 4) {
      Text(label)
        .font(AppTheme.captionFont.weight(.semibold))
      Text(value)
        .font(AppTheme.monoFont)
    }
    .foregroundColor(AppTheme.muted)
    .padding(.horizontal, 8)
    .padding(.vertical, 4)
    .background(AppTheme.card)
    .cornerRadius(999)
  }

  private static let timeFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.dateStyle = .medium
    formatter.timeStyle = .short
    return formatter
  }()
}
