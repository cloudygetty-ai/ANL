#!/bin/bash
# .devcontainer/setup.sh
# Auto-runs when Codespace is created

set -e
echo "🌙 Setting up ANL — AllNightLong..."

# ─── NODE / NPM ───────────────────────────────────────────────
node --version
npm --version

# ─── GLOBAL TOOLS ────────────────────────────────────────────
echo "📦 Installing global tools..."
npm install -g expo-cli@latest eas-cli@latest --silent

# ─── FRONTEND DEPENDENCIES ───────────────────────────────────
echo "📱 Installing frontend dependencies..."
npm install --legacy-peer-deps

# ─── EXPO INSTALL (native-compatible versions) ────────────────
echo "⚡ Running expo install to align native deps..."
npx expo install --fix || true

# ─── BACKEND DEPENDENCIES ─────────────────────────────────────
if [ -f "backend/package.json" ]; then
  echo "🖥️  Installing backend dependencies..."
  cd backend && npm install --silent && cd ..
fi

# ─── ENV FILES ────────────────────────────────────────────────
echo "🔧 Setting up env files..."

if [ ! -f ".env" ]; then
  cat > .env << 'ENV'
# ANL Frontend Environment
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
EXPO_PUBLIC_WEBRTC_URL=ws://localhost:4001
EXPO_PUBLIC_PROJECT_ID=your-expo-project-id
ENV
  echo "✅ Created .env — fill in your keys"
fi

if [ -f "backend/.env.example" ] && [ ! -f "backend/.env" ]; then
  cp backend/.env.example backend/.env
  echo "✅ Created backend/.env from example"
fi

# ─── TUNNEL SETUP ─────────────────────────────────────────────
echo "🌐 Installing tunnel support..."
npm install -g @expo/ngrok --silent || true

# ─── DONE ─────────────────────────────────────────────────────
echo ""
echo "✅ ANL setup complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 To start the app:"
echo "   npx expo start --tunnel"
echo ""
echo "🖥️  To start the backend:"
echo "   cd backend && npm run dev"
echo ""
echo "📱 Then scan the QR code with Expo Go"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
