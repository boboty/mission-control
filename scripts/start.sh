#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$ROOT_DIR/run" "$ROOT_DIR/logs"

start() {
  local name="$1" cmd="$2"
  local pidf="$ROOT_DIR/run/$name.pid" logf="$ROOT_DIR/logs/$name.log"
  if [[ -f "$pidf" ]] && kill -0 "$(cat "$pidf")" 2>/dev/null; then
    echo "[$name] already running (pid=$(cat "$pidf"))"; return
  fi
  rm -f "$pidf"
  nohup bash -lc "cd '$ROOT_DIR' && $cmd" >>"$logf" 2>&1 &
  echo $! >"$pidf"
  echo "[$name] started pid=$(cat "$pidf")"
}

start next "npm run dev:next"
