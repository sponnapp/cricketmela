#!/bin/bash
# ============================================================
# Cricket Mela – Oracle VM One-Time Setup
# Run once after cloning the repo on the VM
# ============================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Cricket Mela VM Setup ==="
echo ""

# ── 1. Node.js 18+ ──────────────────────────────────────────
if command -v node &>/dev/null; then
  NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_MAJOR" -lt 18 ]; then
    echo "Node.js $NODE_MAJOR found — upgrading to 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
  else
    echo "✅ Node.js $(node -v) already installed"
  fi
else
  echo "Installing Node.js 18..."
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "   Node: $(node -v) | npm: $(npm -v)"
echo ""

# ── 2. Backend dependencies ──────────────────────────────────
echo "Installing backend dependencies..."
cd "$SCRIPT_DIR/backend"
npm install --omit=dev
echo "✅ Backend deps installed"
echo ""

# ── 3. Backend .env ──────────────────────────────────────────
if [ ! -f "$SCRIPT_DIR/backend/.env" ]; then
  echo "Creating backend/.env from .env.example..."
  cp "$SCRIPT_DIR/backend/.env.example" "$SCRIPT_DIR/backend/.env"
  # Patch for VM: keep NODE_ENV=development so SQLite lands in backend/
  sed -i 's/^NODE_ENV=.*/NODE_ENV=development/' "$SCRIPT_DIR/backend/.env"

  # Set BACKEND_URL and FRONTEND_URL to the VM's real IP
  VM_IP=$(hostname -I | awk '{print $1}')
  echo "" >> "$SCRIPT_DIR/backend/.env"
  echo "# VM host overrides (auto-set by vm-setup.sh)" >> "$SCRIPT_DIR/backend/.env"
  echo "BACKEND_URL=http://$VM_IP:4000" >> "$SCRIPT_DIR/backend/.env"
  echo "FRONTEND_URL=http://$VM_IP:5173" >> "$SCRIPT_DIR/backend/.env"
  echo "⚠️  Review backend/.env (SESSION_SECRET, Google OAuth, etc.) before starting"
else
  echo "✅ backend/.env already exists"
fi
echo ""

# ── 4. SQLite data directory ─────────────────────────────────
mkdir -p "$SCRIPT_DIR/backend/data"
echo "✅ Data directory: $SCRIPT_DIR/backend/data"
echo ""

# ── 5. Frontend dependencies ─────────────────────────────────
echo "Installing frontend dependencies..."
cd "$SCRIPT_DIR/frontend"
npm install
echo "✅ Frontend deps installed"
echo ""

# ── Done ─────────────────────────────────────────────────────
VM_IP=$(hostname -I | awk '{print $1}')

echo "=============================================="
echo "✅  Setup complete!"
echo "=============================================="
echo ""
echo "Start the app:  ./start-vm.sh"
echo "Frontend URL:   http://$VM_IP:5173"
echo "Backend URL:    http://$VM_IP:4000"
echo ""
echo "⚠️  Make sure Oracle Cloud ingress rules allow TCP ports 4000 and 5173"
