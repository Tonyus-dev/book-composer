#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="4185"
URL="http://127.0.0.1:${PORT}/"

if ! curl --silent --fail --max-time 1 "$URL" >/dev/null 2>&1; then
  nohup bun run dev -- --host 127.0.0.1 --port "$PORT" \
    >"${TMPDIR:-/tmp}/kallistis-book-maker.log" 2>&1 &
  for _ in $(seq 1 30); do
    curl --silent --fail --max-time 1 "$URL" >/dev/null 2>&1 && break
    sleep 1
  done
fi

exec xdg-open "$URL"
