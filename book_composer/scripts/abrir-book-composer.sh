#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="4185"
URL="http://127.0.0.1:${PORT}/"
BUN_BIN="${BUN_BIN:-/home/tonyus-dev/.bun/bin/bun}"

if [[ ! -x "$BUN_BIN" ]]; then
  BUN_BIN="$(command -v bun || true)"
fi
if [[ -z "$BUN_BIN" || ! -x "$BUN_BIN" ]]; then
  echo "Bun não encontrado; esperado em /home/tonyus-dev/.bun/bin/bun" >&2
  exit 127
fi

if ! curl --silent --fail --max-time 1 "$URL" >/dev/null 2>&1; then
  nohup "$BUN_BIN" run dev -- --host 127.0.0.1 --port "$PORT" \
    >"${TMPDIR:-/tmp}/book-composer.log" 2>&1 &
  for _ in $(seq 1 30); do
    curl --silent --fail --max-time 1 "$URL" >/dev/null 2>&1 && break
    sleep 1
  done
fi

exec xdg-open "$URL"
