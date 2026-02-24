#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
case "${1:-all}" in
  convex) tail -n 200 -f "$ROOT_DIR/logs/convex.log" ;;
  next) tail -n 200 -f "$ROOT_DIR/logs/next.log" ;;
  all)
    echo "=== convex.log ==="; tail -n 80 "$ROOT_DIR/logs/convex.log" 2>/dev/null || true
    echo "=== next.log ==="; tail -n 80 "$ROOT_DIR/logs/next.log" 2>/dev/null || true
    ;;
  *) echo "Usage: $0 [convex|next|all]"; exit 1;;
esac
