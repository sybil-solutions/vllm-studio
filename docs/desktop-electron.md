# Desktop App (Electron)

The vLLM Studio desktop app wraps the Next.js frontend in Electron for a native macOS experience.

---

## Quick Start

```bash
cd frontend
npm run desktop:dev       # next dev + electron shell
npm run desktop:build     # next standalone + desktop main build
npm run desktop:dist      # production installers in dist-desktop/
```

---

## Dev Mode — Iterate Without Reinstalling

Launch Electron against the local dev server so frontend changes appear immediately:

```bash
# Terminal 1: dev server on port 3001
cd frontend && PORT=3001 npm run dev

# Terminal 2: Electron against dev server
cd frontend && npm run desktop:build:main && \
  VLLM_STUDIO_DESKTOP_DEV_SERVER_URL=http://127.0.0.1:3001 npm run desktop:start
```

---

## Build & Install

### Fast test build (skip DMG/ZIP)

```bash
cd frontend && npm run desktop:pack
```

Builds `frontend/dist-desktop/mac-arm64/vLLM Studio.app` only — no distributables.

### Production build (signed app + DMG/ZIP)

```bash
cd frontend && npm run desktop:dist
```

---

## Install the Built App

There must be **one canonical install** at `/Applications/vLLM Studio.app`. Do not layer a new build over the old one — stale sealed resources will invalidate the code signature.

```bash
# Apple Silicon
rm -rf "/Applications/vLLM Studio.app"
ditto "frontend/dist-desktop/mac-arm64/vLLM Studio.app" "/Applications/vLLM Studio.app"

# Remove legacy non-canonical install if present
rm -rf "$HOME/Applications/vllm-studio-mac.app"

# Relaunch
killall "vLLM Studio" >/dev/null 2>&1 || true
open -a "vLLM Studio"
```

---

## Verify

```bash
# Must show only /Applications/vLLM Studio.app
find /Applications "$HOME/Applications" -maxdepth 1 -type d -iname "*v*llm*studio*.app"

# Must print org.vllm.studio.desktop
/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' \
  "/Applications/vLLM Studio.app/Contents/Info.plist"
```

---

## Pre-Push Quality Gate

Before pushing or calling a feature production-ready:

```bash
git push   # triggers .githooks/pre-push — checks conventional commits + runs check:quality
```

For a full production artifact:

```bash
cd frontend && npm run desktop:dist
```

---

## Canonical Paths

| What | Path |
|---|---|
| Installed app | `/Applications/vLLM Studio.app` |
| Bundle ID | `org.vllm.studio.desktop` |
| Legacy install (remove) | `~/Applications/vllm-studio-mac.app` |
| Build output (arm64) | `frontend/dist-desktop/mac-arm64/` |
