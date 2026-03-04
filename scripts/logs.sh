#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

case "${1:-all}" in
  next) tail -n 200 -f "$ROOT_DIR/logs/next.log" ;;
  all)  echo "=== next.log ==="; tail -n 120 "$ROOT_DIR/logs/next.log" 2>/dev/null || true ;;
  *) echo "Usage: $0 [next|all]"; exit 1;;
esac
