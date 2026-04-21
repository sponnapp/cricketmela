#!/bin/bash
# ============================================================
# Cricket Mela – Start both servers on the Oracle VM
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_LOG="$SCRIPT_DIR/backend.log"
FRONTEND_LOG="$SCRIPT_DIR/frontend.log"
PID_FILE="$SCRIPT_DIR/.vm-pids"

# ── Stop any running instances ───────────────────────────────
if [ -f "$PID_FILE" ]; then
  echo "Stopping previous instances..."
  while IFS= read -r pid; do
    kill "$pid" 2>/dev/null && echo "  Killed PID $pid" || true
  done < "$PID_FILE"
  rm -f "$PID_FILE"
  sleep 1
fi

echo "=== Starting Cricket Mela ==="
echo ""

# ── Start backend ────────────────────────────────────────────
echo "▶ Starting backend (port 4000)..."
cd "$SCRIPT_DIR/backend"
node index.js > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
echo "  PID: $BACKEND_PID | Log: backend.log"

# Wait and verify
sleep 2
if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
  echo ""
  echo "❌ Backend failed to start. Last 20 lines of backend.log:"
  tail -20 "$BACKEND_LOG"
  exit 1
fi
echo "  ✅ Backend running"
echo ""

# ── Start frontend dev server ─────────────────────────────────
echo "▶ Starting frontend dev server (port 5173)..."
cd "$SCRIPT_DIR/frontend"
npm run dev > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
echo "  PID: $FRONTEND_PID | Log: frontend.log"
sleep 2
echo "  ✅ Frontend running"
echo ""

# ── Save PIDs ─────────────────────────────────────────────────
printf '%s\n' "$BACKEND_PID" "$FRONTEND_PID" > "$PID_FILE"

VM_IP=$(hostname -I | awk '{print $1}')

echo "=============================================="
echo "✅  Cricket Mela is running!"
echo "=============================================="
echo ""
echo "  Frontend:  http://$VM_IP:5173"
echo "  Backend:   http://$VM_IP:4000/api/health"
echo ""
echo "  Follow logs:"
echo "    tail -f backend.log"
echo "    tail -f frontend.log"
echo ""
echo "  Stop all:  ./stop-vm.sh"
echo ""
