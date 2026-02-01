// CRITICAL
import Foundation

extension ChatDetailViewModel {
  func makeCompletionPayload(stream: Bool) -> ChatCompletionRequest {
    let model = sessionModel ?? messages.first(where: { $0.model != nil })?.model ?? "default"
    let openaiMessages = buildPromptMessages()
    var toolDefs: [ToolDefinition] = []
    if settings?.mcpEnabled == true { toolDefs.append(contentsOf: tools.map { toolDef(for: $0) }) }
    if settings?.planModeEnabled == true || settings?.deepResearchEnabled == true {
      toolDefs.append(contentsOf: PlanTools.definitions)
    }
    return ChatCompletionRequest(model: model, messages: openaiMessages, tools: toolDefs.isEmpty ? nil : toolDefs, stream: stream, temperature: 0.7)
  }

  func buildPromptMessages() -> [OpenAIMessage] {
    var promptMessages: [OpenAIMessage] = []
    if let prompt = combinedPrompt {
      promptMessages.append(OpenAIMessage(role: "system", content: prompt, toolCalls: nil, toolCallId: nil, name: nil))
    }
    promptMessages.append(contentsOf: buildOpenAIMessages(from: messages))
    return promptMessages
  }

  private var combinedPrompt: String? {
    let base = systemPrompt.trimmingCharacters(in: .whitespacesAndNewlines)
    let planMode = (settings?.planModeEnabled == true || settings?.deepResearchEnabled == true) ? """

Plan mode is enabled.
- Call create_plan before starting work.
- Use update_plan to mark steps as in progress or done.
""" : ""
    let researchConfig = settings?.deepResearchConfig ?? DeepResearchConfig.default
    let research = settings?.deepResearchEnabled == true ? """

Deep Research mode is enabled.
- Ask up to 3 clarifying questions if the request is underspecified.
- Propose a brief research plan before executing.
- Generate focused search queries, run them, and collect sources.
- Prioritize the most relevant sources and drop weak or duplicative ones.
- Track evidence gaps and run follow-up queries to fill them.
- Provide a structured report with citations for key claims.
- Search depth: \(researchConfig.depth.label)
- Max sources: \(researchConfig.maxSources)
- Auto summarize: \(researchConfig.autoSummarize ? "on" : "off")
- Include citations: \(researchConfig.includeCitations ? "on" : "off")

If clarification is needed, respond only with questions.
Otherwise, reply in this order:
1) Research plan
2) Findings (with citations)
3) Final answer
4) Sources
""" : ""
    let plan = PlanToolHandler.promptSection(currentPlan) ?? ""
    let combined = base + planMode + research + plan
    return combined.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : combined
  }
}
