#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="$ROOT_DIR/network.conf"

if [[ ! -f "$CONFIG_FILE" ]]; then
  if [[ ! -t 0 ]]; then
    echo "network.conf is missing. Run this script in a terminal or copy network.conf.example to network.conf." >&2
    exit 1
  fi
  read -r -p "API server URL (for example https://api.example.com): " API_BASE_URL
  if [[ -z "$API_BASE_URL" ]]; then
    echo "API server URL is required." >&2
    exit 1
  fi
  printf 'API_BASE_URL=%s\n' "$API_BASE_URL" > "$CONFIG_FILE"
fi

API_BASE_URL="$(awk -F= '/^[[:space:]]*API_BASE_URL[[:space:]]*=/ { sub(/^[^=]*=/, ""); gsub(/^[[:space:]\047\"]+|[[:space:]\047\"]+$/, ""); print; exit }' "$CONFIG_FILE")"
if [[ -z "$API_BASE_URL" ]]; then
  echo "API_BASE_URL is missing in network.conf." >&2
  exit 1
fi

node - "$API_BASE_URL" <<'NODE'
const value = process.argv[2];
let url;
try { url = new URL(value); } catch { throw new Error('API_BASE_URL must be a valid http:// or https:// origin'); }
if (!['http:', 'https:'].includes(url.protocol)) throw new Error('API_BASE_URL must use http or https');
if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
  throw new Error('API_BASE_URL must contain only the server origin, without credentials, path, query, or fragment');
}
if (['localhost', '127.0.0.1'].includes(url.hostname)) {
  console.warn('Note: localhost points to the Android device. Use 10.0.2.2 for the Android emulator, or the server LAN IP for a physical phone.');
}
NODE

if ! command -v java >/dev/null 2>&1; then
  echo "Java JDK is required by AndroidJS. Install a JDK, then run this script again." >&2
  exit 1
fi
if [[ ! -x "$ROOT_DIR/node_modules/.bin/vite" || ! -x "$ROOT_DIR/node_modules/.bin/androidjs" ]]; then
  echo "Project dependencies are missing. Run npm install first." >&2
  exit 1
fi

echo "Building mobile UI with API: $API_BASE_URL"
RUNSTOCK_API_BASE_URL="$API_BASE_URL" npm --prefix "$ROOT_DIR" run build:mobile

mkdir -p "$ROOT_DIR/androidjs/views" "$ROOT_DIR/androidjs/assets"
find "$ROOT_DIR/androidjs/views" -mindepth 1 -maxdepth 1 ! -name .gitkeep -exec rm -rf {} +
find "$ROOT_DIR/androidjs/assets" -mindepth 1 -maxdepth 1 ! -name .gitkeep -exec rm -rf {} +
cp -R "$ROOT_DIR/dist-mobile/." "$ROOT_DIR/androidjs/views/"
mv "$ROOT_DIR/androidjs/views/mobile.html" "$ROOT_DIR/androidjs/views/index.html"
cp "$CONFIG_FILE" "$ROOT_DIR/androidjs/assets/network.conf"

node "$ROOT_DIR/scripts/androidjs/configure-builder.mjs" "$API_BASE_URL"
echo "Building AndroidJS APK..."
(cd "$ROOT_DIR/androidjs" && "$ROOT_DIR/node_modules/.bin/androidjs" build --release)

APK_SOURCE="$ROOT_DIR/androidjs/dist/runstock-android.apk"
APK_DIR="$ROOT_DIR/dist-apk"
APK_OUTPUT="$APK_DIR/RunStock.apk"
if [[ ! -f "$APK_SOURCE" ]]; then
  echo "AndroidJS finished without producing the expected APK: $APK_SOURCE" >&2
  exit 1
fi
mkdir -p "$APK_DIR"
cp "$APK_SOURCE" "$APK_OUTPUT"
echo "APK ready: $APK_OUTPUT"
