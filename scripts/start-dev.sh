#!/bin/bash
# scripts/start-dev.sh
# Start entire ANL stack locally for testing

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ANL FULL STACK — LOCAL DEVELOPMENT                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check Node version
NODE_VER=$(node -v | cut -d. -f1 | tr -d 'v')
if [ "$NODE_VER" -lt 18 ]; then
    echo "✗ Node 18+ required (you have $(node -v))"
    exit 1
fi

echo "✓ Node $(node -v)"

# Install backend deps
echo ""
echo "Installing backend dependencies..."
cd backend
npm install > /dev/null 2>&1
cd ..
echo "✓ Backend dependencies installed"

# Install frontend deps
echo ""
echo "Installing frontend dependencies..."
npm install > /dev/null 2>&1
echo "✓ Frontend dependencies installed"

# Start backend in background
echo ""
echo "Starting backend (port 3001)..."
cd backend
npm run dev > /tmp/anl-backend.log 2>&1 &
BACKEND_PID=$!
cd ..
echo "✓ Backend PID: $BACKEND_PID"

# Give backend 2 seconds to start
sleep 2

# Test backend health
echo ""
echo "Testing backend health..."
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✓ Backend responding"
else
    echo "✗ Backend failed to start"
    echo "Check logs: tail /tmp/anl-backend.log"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Start frontend in background
echo ""
echo "Starting frontend (port 5173)..."
npm run dev > /tmp/anl-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✓ Frontend PID: $FRONTEND_PID"

# Give frontend 3 seconds to start
sleep 3

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  SERVICES RUNNING                                          ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║  Frontend:   http://localhost:5173                         ║"
echo "║  Backend:    http://localhost:3001                         ║"
echo "║  WebSocket:  ws://localhost:3001                           ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║  Test OTP:   123456 or 000000                              ║"
echo "║  Test Phone: +1 234 567 8900                               ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║  Backend logs: tail /tmp/anl-backend.log                   ║"
echo "║  Frontend logs: tail /tmp/anl-frontend.log                 ║"
echo "║  Kill all: kill $BACKEND_PID $FRONTEND_PID                 ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Keep processes alive
wait
