#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

stop() {
  local name="$1"
  local pidf="$ROOT_DIR/run/$name.pid"
  if [[ ! -f "$pidf" ]]; then echo "[$name] not running"; return; fi
  local pid; pid="$(cat "$pidf")"
  kill "$pid" 2>/dev/null || true
  sleep 1
  kill -9 "$pid" 2>/dev/null || true
  rm -f "$pidf"
  echo "[$name] stopped"
}

stop next
stop convex
