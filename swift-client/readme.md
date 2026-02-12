# swift-client

SwiftUI client for vLLM Studio.

- Sources: `swift-client/sources`
- Info.plist: `swift-client/resources/info.plist`
- Update backend URL + API key in the Configs tab inside the app.

## Build Notes

```bash
cd swift-client
./setup.sh
./verify-build.sh
```

- `setup.sh` regenerates `vllm-studio.xcodeproj` from `project.yml`.
- Regenerate after any Swift file add/move/rename.
- `verify-build.sh` runs the CLI build check used by contributors.
