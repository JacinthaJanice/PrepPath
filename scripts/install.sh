#!/usr/bin/env bash
# ════════════════════════════════════════════════
#  PrepPath — One-shot Setup Script
#  Run: bash scripts/install.sh
# ════════════════════════════════════════════════

set -e
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}╔═══════════════════════════════════╗${NC}"
echo -e "${CYAN}║     PrepPath v3 — Setup           ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════╝${NC}"
echo ""

# ── Check Node.js ──
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Install from https://nodejs.org (v18+)"
  exit 1
fi
NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 18 ]; then
  echo "❌ Node.js v18+ required. Found: $(node -v)"
  exit 1
fi
echo -e "${GREEN}✓${NC} Node.js $(node -v)"
echo -e "${GREEN}✓${NC} npm $(npm -v)"

# ── Install deps in parallel ──
echo ""
echo "📦 Installing backend and frontend dependencies in parallel..."

(cd backend && npm ci --prefer-offline --silent) &
BACKEND_PID=$!

(cd frontend && npm ci --prefer-offline --silent) &
FRONTEND_PID=$!

wait $BACKEND_PID
BACKEND_EXIT=$?

wait $FRONTEND_PID
FRONTEND_EXIT=$?

[ $BACKEND_EXIT -eq 0 ] && echo -e "${GREEN}✓${NC} Backend packages installed" \
  || { echo "❌ Backend install failed"; exit 1; }

[ $FRONTEND_EXIT -eq 0 ] && echo -e "${GREEN}✓${NC} Frontend packages installed" \
  || { echo "❌ Frontend install failed"; exit 1; }

# ── Create .env if missing ──
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo -e "${YELLOW}⚠${NC}  Created backend/.env from template"
  echo -e "   👉 Edit backend/.env and fill in your Supabase URL and keys"
fi

# ── Copy app file if not present ──
if [ ! -f frontend/index.html ]; then
  if [ -f "../preppath-v3.html" ]; then
    cp ../preppath-v3.html frontend/index.html
    echo -e "${GREEN}✓${NC} Copied preppath-v3.html → frontend/index.html"
  else
    echo -e "${YELLOW}⚠${NC}  frontend/index.html not found"
    echo "   Copy your preppath-v3.html into the frontend/ folder and rename it index.html"
  fi
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Setup complete!${NC}"
echo -e "${GREEN}═══════════════════════════════════${NC}"
echo ""
echo "  Next steps:"
echo ""
echo -e "  ${CYAN}1.${NC} Set up Supabase database:"
echo "     → Go to supabase.com → SQL Editor"
echo "     → Copy & run: database/setup.sql"
echo ""
echo -e "  ${CYAN}2.${NC} Fill in your credentials:"
echo "     → Edit backend/.env (add Supabase URL + keys)"
echo "     → Edit frontend/config.js (add BACKEND_URL)"
echo ""
echo -e "  ${CYAN}3.${NC} Start the backend:"
echo "     cd backend && npm run dev"
echo ""
echo -e "  ${CYAN}4.${NC} Start the frontend:"
echo "     cd frontend && npm run dev"
echo ""
echo -e "  ${CYAN}5.${NC} Verify database:"
echo "     cd backend && npm run setup-db"
echo ""
