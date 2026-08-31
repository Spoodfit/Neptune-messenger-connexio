#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-start}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

# Keep the Codex/container preview independent from read-only home folders and
# unavailable local-network discovery services. Existing values remain respected.
export EXPO_NO_TELEMETRY="${EXPO_NO_TELEMETRY:-1}"
export EXPO_CLI_HOME="${EXPO_CLI_HOME:-/tmp/connexio-expo-cli}"
export XDG_CACHE_HOME="${XDG_CACHE_HOME:-/tmp/connexio-expo-cache}"
export EXPO_UNSTABLE_BONJOUR="${EXPO_UNSTABLE_BONJOUR:-0}"

show_usage() {
  cat <<'USAGE'
usage: ./script/build_and_run.sh [mode]

Modes:
  start, run        Start the Expo dev server
  --ios, ios        Start Expo and open iOS
  --android, android
                   Start Expo and open Android
  --web, web        Start Expo for web
  --dev-client      Start Expo in development-client mode
  --tunnel          Start Expo using tunnel transport
  --export-web      Export the web build locally
  --doctor          Run Expo diagnostics
  --help            Show this help
USAGE
}

resolve_expo_cmd() {
  if [[ -n "${EXPO_CLI:-}" ]]; then
    # Optional escape hatch for a project-specific Expo wrapper.
    # shellcheck disable=SC2206
    EXPO_CMD=(${EXPO_CLI})
  elif [[ -x "$ROOT_DIR/node_modules/.bin/expo" ]]; then
    EXPO_CMD=("$ROOT_DIR/node_modules/.bin/expo")
  elif command -v npm >/dev/null 2>&1; then
    EXPO_CMD=(npm exec -- expo)
  else
    EXPO_CMD=(npx expo)
  fi
}

run_doctor() {
  if [[ -x "$ROOT_DIR/node_modules/.bin/expo-doctor" ]]; then
    exec "$ROOT_DIR/node_modules/.bin/expo-doctor"
  fi
  exec npx expo-doctor
}

resolve_expo_cmd

case "$MODE" in
  start|run)
    exec "${EXPO_CMD[@]}" start
    ;;
  --ios|ios)
    exec "${EXPO_CMD[@]}" start --ios
    ;;
  --android|android)
    exec "${EXPO_CMD[@]}" start --android
    ;;
  --web|web)
    exec "${EXPO_CMD[@]}" start --web --localhost
    ;;
  --dev-client|dev-client)
    exec "${EXPO_CMD[@]}" start --dev-client
    ;;
  --tunnel|tunnel)
    exec "${EXPO_CMD[@]}" start --tunnel
    ;;
  --export-web|export-web)
    exec "${EXPO_CMD[@]}" export --platform web
    ;;
  --doctor|doctor)
    run_doctor
    ;;
  --help|help)
    show_usage
    ;;
  *)
    show_usage >&2
    exit 2
    ;;
esac
