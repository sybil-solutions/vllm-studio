# swift-client

SwiftUI client for vLLM Studio.

- Sources: `swift-client/sources`
- Info.plist: `swift-client/resources/info.plist`
- Update backend URL + API key in Configs tab

Build notes
- Create an iOS App in Xcode and point it at `swift-client/sources`
- Use `swift-client/resources/info.plist` for the target Info.plist

Chat UX notes
- Chat composer uses a single-row layout with a plus menu for attachments, models, and modes.
- Plan mode shows a plan drawer and uses plan tools (`create_plan`, `update_plan`) when enabled.
- Deep research mode adds structured guidance; enable it from the composer menu or Configs.
- Trace panel is available via right-edge swipe or the toolbar button to inspect reasoning, tools, and results.
