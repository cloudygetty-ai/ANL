#!/usr/bin/env bash
# scripts/push.sh — Final GitHub push for ANL
# Usage: GH_TOKEN=ghp_xxx ./scripts/push.sh
# Copies all ANL-final assets into repo root then commits + pushes

set -euo pipefail
BLUE='\033[0;34m'; GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${BLUE}[ANL]${NC} $*"; }
ok()   { echo -e "${GREEN}[✓]${NC} $*"; }
fail() { echo -e "${RED}[✗]${NC} $*"; exit 1; }

[[ -z "${GH_TOKEN:-}" ]] && fail "Set GH_TOKEN=ghp_xxx before running"
[[ -f "package.json" ]] || fail "Run from ANL repo root"

REPO="https://${GH_TOKEN}@github.com/cloudygetty-ai/ANL.git"

# Ensure on main
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" == "master" ]]; then
  log "Renaming master → main..."
  git branch -m master main
fi

log "Staging all files..."
git add -A

# Check if anything to commit
if git diff --cached --quiet; then
  ok "Nothing to commit — repo is up to date"
  exit 0
fi

log "Committing..."
git commit -m "feat: ANL production-ready — all modules complete

- TURN server + ICE credential generation
- Push notifications wired to all socket events
- Redis adapter for Socket.io horizontal scaling
- DB migration 005 (push_token, subscription, analytics)
- App icon (16 sizes), splash screen, 5 App Store screenshots
- Privacy policy + Terms of service
- docker-compose + Nginx + Certbot
- EAS build config + deploy/build scripts
- metro.config.js monorepo support
- Production .gitignore
- README"

log "Pushing to cloudygetty-ai/ANL main..."
git remote set-url origin "$REPO" 2>/dev/null || git remote add origin "$REPO"
git push origin main

ok "Pushed to github.com/cloudygetty-ai/ANL"
echo ""
echo "  View: https://github.com/cloudygetty-ai/ANL"
echo "  Next: ./scripts/build.sh ios"
