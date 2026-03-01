#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
for n in convex next; do
  pidf="$ROOT_DIR/run/$n.pid"
  if [[ -f "$pidf" ]] && kill -0 "$(cat "$pidf")" 2>/dev/null; then
    echo "[$n] running (pid=$(cat "$pidf"))"
  else
    echo "[$n] not running"
  fi
done
