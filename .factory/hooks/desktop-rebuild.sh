#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${FACTORY_PROJECT_DIR:-$(cd -- "$SCRIPT_DIR/../.." && pwd)}"
MARKER="$PROJECT_DIR/.factory/.needs-desktop-rebuild"

should_mark_file() {
  local file_path="$1"
  case "$file_path" in
    "$PROJECT_DIR/frontend/src/"*|\
    "$PROJECT_DIR/frontend/desktop/"*|\
    "$PROJECT_DIR/frontend/package.json"|\
    "$PROJECT_DIR/frontend/package-lock.json"|\
    "$PROJECT_DIR/frontend/next.config."*|\
    "$PROJECT_DIR/package.json"|\
    "$PROJECT_DIR/package-lock.json")
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

mark_if_needed() {
  local file_path
  file_path="$(python3 -c 'import json, sys
try:
    data = json.load(sys.stdin)
except Exception:
    print("")
    raise SystemExit(0)
tool_input = data.get("tool_input", {})
for key in ("file_path", "filename"):
    value = tool_input.get(key)
    if isinstance(value, str) and value:
        print(value)
        raise SystemExit(0)
print("")'
)"
  if [[ -n "$file_path" ]] && should_mark_file "$file_path"; then
    date -u +"%Y-%m-%dT%H:%M:%SZ" > "$MARKER"
  fi
}

rebuild_if_marked() {
  [[ -f "$MARKER" ]] || exit 0

  cd "$PROJECT_DIR/frontend"
  npm run desktop:dist

  rm -rf "/Applications/vLLM Studio.app"
  if [[ -d "$PROJECT_DIR/frontend/dist-desktop/mac-arm64/vLLM Studio.app" ]]; then
    ditto "$PROJECT_DIR/frontend/dist-desktop/mac-arm64/vLLM Studio.app" "/Applications/vLLM Studio.app"
  else
    ditto "$PROJECT_DIR/frontend/dist-desktop/mac/vLLM Studio.app" "/Applications/vLLM Studio.app"
  fi

  rm -rf "$HOME/Applications/vllm-studio-mac.app"
  killall "vLLM Studio" >/dev/null 2>&1 || true
  open -a "vLLM Studio"

  find /Applications "$HOME/Applications" -maxdepth 1 -type d -iname "*v*llm*studio*.app"
  /usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "/Applications/vLLM Studio.app/Contents/Info.plist"
  rm -f "$MARKER"
}

case "${1:-}" in
  mark)
    mark_if_needed
    ;;
  rebuild)
    rebuild_if_marked
    ;;
  *)
    echo "usage: $0 mark|rebuild" >&2
    exit 2
    ;;
esac
