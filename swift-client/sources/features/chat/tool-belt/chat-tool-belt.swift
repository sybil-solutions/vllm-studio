// CRITICAL
import PhotosUI
import SwiftUI
import UniformTypeIdentifiers

#if canImport(UIKit)
    import UIKit
#endif

struct ChatToolBelt: View {
    @Binding var text: String
    @Binding var attachments: [ChatAttachment]
    @ObservedObject var settings: SettingsStore
    let models: [OpenAIModelInfo]
    let selectedModel: String?
    let onModelChange: (String) -> Void
    let onSend: ([ChatAttachment]) -> Void
    let onShowTools: () -> Void
    let onShowMcpSettings: () -> Void
    let isProcessing: Bool

    @State private var showFilePicker = false
    @State private var showImagePicker = false
    @State private var imageItems: [PhotosPickerItem] = []
    @State private var isTranscribing = false
    @State private var sendPulse = false
    @StateObject private var recorder = AudioRecorder()

    var body: some View {
        VStack(spacing: 8) {
            if isProcessing {
                ShimmerBar()
            }
            if !attachments.isEmpty {
                ChatAttachmentsView(attachments: attachments, onRemove: removeAttachment)
            }
            if isTranscribing {
                Text("Transcribing...").font(AppTheme.captionFont).foregroundColor(AppTheme.muted)
            }
            HStack(alignment: .bottom, spacing: 10) {
                Menu {
                    Button(action: { showFilePicker = true }) {
                        Label("Attach File", systemImage: "paperclip")
                    }
                    Button(action: { showImagePicker = true }) {
                        Label("Add Image", systemImage: "photo")
                    }
                    Button(action: handleRecord) {
                        Label(
                            recorder.isRecording ? "Stop Recording" : "Record Audio",
                            systemImage: recorder.isRecording ? "stop.circle" : "mic")
                    }
                    Divider()
                    if models.isEmpty {
                        Text("No models loaded")
                    } else {
                        ForEach(models) { model in
                            Button(action: { onModelChange(model.id) }) {
                                HStack {
                                    Text(model.id)
                                    if model.id == selectedModel { Image(systemName: "checkmark") }
                                }
                            }
                        }
                    }
                    Divider()
                    Button(action: { settings.mcpEnabled.toggle() }) {
                        Label(
                            settings.mcpEnabled ? "MCP On" : "MCP Off",
                            systemImage: settings.mcpEnabled ? "bolt.fill" : "bolt")
                    }
                    Button(action: { settings.deepResearchEnabled.toggle() }) {
                        Label(
                            settings.deepResearchEnabled ? "Deep Research On" : "Deep Research Off",
                            systemImage: settings.deepResearchEnabled
                                ? "globe.americas.fill" : "globe")
                    }
                    Button(action: { settings.planModeEnabled.toggle() }) {
                        Label(
                            settings.planModeEnabled ? "Plan Mode On" : "Plan Mode Off",
                            systemImage: settings.planModeEnabled
                                ? "list.bullet.clipboard.fill" : "list.bullet.clipboard")
                    }
                    Divider()
                    Button(action: onShowTools) { Label("Tools", systemImage: "wrench") }
                    Button(action: onShowMcpSettings) {
                        Label("Manage MCPs", systemImage: "server.rack")
                    }
                } label: {
                    Image(systemName: "plus")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(AppTheme.foreground)
                        .frame(width: 34, height: 34)
                        .background(AppTheme.card)
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(AppTheme.border, lineWidth: 1)
                        )
                        .offset(y: -4)
                }
                .accessibilityLabel("Add tools")
                .accessibilityHint("Open attachments, models, and settings")

                ZStack(alignment: .leading) {
                    if text.isEmpty {
                        Text("Message...")
                            .font(AppTheme.bodyFont)
                            .foregroundColor(AppTheme.muted)
                            .padding(.horizontal, 12)
                    }
                    TextField("", text: $text, axis: .vertical)
                        .lineLimit(1...6)
                        .textFieldStyle(.plain)
                        .foregroundColor(AppTheme.foreground)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                }
                .background(AppTheme.card)
                .cornerRadius(12)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(AppTheme.border, lineWidth: 1)
                )

                Button(action: {
                    #if canImport(UIKit)
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    #endif
                    withAnimation(.spring(response: 0.25, dampingFraction: 0.6)) {
                        sendPulse = true
                    }
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.12) {
                        withAnimation(.spring(response: 0.25, dampingFraction: 0.7)) {
                            sendPulse = false
                        }
                    }
                    onSend(attachments)
                }) {
                    Image(systemName: "arrow.up")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(canSend ? AppTheme.foreground : AppTheme.muted)
                        .frame(width: 34, height: 34)
                        .background(
                            canSend
                                ? (isProcessing ? AppTheme.error : AppTheme.accentStrong)
                                : AppTheme.border
                        )
                        .clipShape(Circle())
                }
                .scaleEffect(sendPulse ? 0.92 : 1)
                .animation(.spring(response: 0.25, dampingFraction: 0.7), value: sendPulse)
                .disabled(!canSend)
                .accessibilityLabel("Send")
            }
        }
        .photosPicker(isPresented: $showImagePicker, selection: $imageItems, matching: .images)
        .fileImporter(
            isPresented: $showFilePicker, allowedContentTypes: [.data],
            onCompletion: handleFileResult
        )
        .onChange(of: imageItems.count) { _, newCount in
            guard newCount > 0 else { return }
            let items = imageItems
            imageItems = []
            Task {
                for item in items {
                    #if canImport(UIKit)
                        if let data = try? await item.loadTransferable(type: Data.self),
                            let image = UIImage(data: data)
                        {
                            attachments.append(
                                ChatAttachment(
                                    id: UUID().uuidString, name: "Image", type: .image, url: nil,
                                    image: image))
                        }
                    #endif
                }
            }
        }
    }

    var canSend: Bool {
        !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || !attachments.isEmpty
    }

    func removeAttachment(_ attachment: ChatAttachment) {
        attachments.removeAll { $0.id == attachment.id }
    }

    func handleFileResult(_ result: Result<URL, Error>) {
        guard case .success(let url) = result else { return }
        attachments.append(
            ChatAttachment(
                id: UUID().uuidString, name: url.lastPathComponent, type: .file, url: url,
                image: nil))
    }

    func handleRecord() {
        Task {
            if recorder.isRecording {
                guard let url = recorder.stop() else { return }
                attachments.append(
                    ChatAttachment(
                        id: UUID().uuidString, name: url.lastPathComponent, type: .audio, url: url,
                        image: nil))
                await transcribeAudio(url)
            } else {
                await recorder.start()
            }
        }
    }

    func transcribeAudio(_ url: URL) async {
        isTranscribing = true
        defer { isTranscribing = false }
        if let text = try? await VoiceTranscriber.transcribe(fileUrl: url, settings: settings) {
            self.text = [self.text, text].filter { !$0.isEmpty }.joined(separator: " ")
        }
    }
}

private struct ShimmerBar: View {
    @State private var phase: CGFloat = -1

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(AppTheme.border.opacity(0.8))
                Capsule()
                    .fill(
                        LinearGradient(
                            colors: [
                                AppTheme.accentStrong.opacity(0.0),
                                AppTheme.accentStrong.opacity(0.7),
                                AppTheme.accentStrong.opacity(0.0),
                            ],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(width: geo.size.width * 0.35)
                    .offset(x: phase * geo.size.width)
            }
            .onAppear {
                withAnimation(.linear(duration: 1.1).repeatForever(autoreverses: false)) {
                    phase = 1.2
                }
            }
        }
        .frame(height: 3)
        .clipShape(Capsule())
    }
}
