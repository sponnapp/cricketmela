#!/bin/bash
# ============================================================
# Cricket Mela – Stop both servers on the Oracle VM
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$SCRIPT_DIR/.vm-pids"

if [ ! -f "$PID_FILE" ]; then
  echo "No running instances found (.vm-pids not found)."
  echo "Trying to kill by process name..."
  pkill -f "node index.js" 2>/dev/null && echo "Stopped backend" || true
  pkill -f "vite"          2>/dev/null && echo "Stopped frontend" || true
  exit 0
fi

echo "Stopping Cricket Mela..."
while IFS= read -r pid; do
  if kill "$pid" 2>/dev/null; then
    echo "  Stopped PID $pid"
  else
    echo "  PID $pid was not running"
  fi
done < "$PID_FILE"

rm -f "$PID_FILE"
echo "✅ All stopped."
