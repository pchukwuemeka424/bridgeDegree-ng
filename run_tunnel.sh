#!/usr/bin/env bash
# Cloudflare Tunnel — exposes your local Node app so others can view it.
# Usage:
#   1. Start the app in another terminal:  npm start
#   2. Run this script:  ./run_tunnel.sh
#   3. Share the https://*.trycloudflare.com URL that appears.

set -e
PORT="${PORT:-5000}"
URL="http://127.0.0.1:${PORT}"

if ! command -v cloudflared &> /dev/null; then
  echo "cloudflared is not installed."
  echo ""
  echo "Install it first:"
  echo "  macOS (Homebrew):  brew install cloudflared"
  echo "  Or download:       https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
  exit 1
fi

echo "Starting Cloudflare Tunnel to ${URL}"
echo "Make sure the Node app is running (npm start) in another terminal."
echo ""
cloudflared tunnel --url "$URL"
