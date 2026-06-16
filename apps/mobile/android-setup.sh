#!/usr/bin/env bash
# Phase 5 – one-time Android platform setup
# Run from e-iwas-baha/ root after installing all packages.
#
# Prerequisites:
#   - Android Studio with SDK 33+ installed
#   - ANDROID_HOME env var set
#   - Web app built: (cd apps/web && npm run build)

set -e

echo "==> Building web app..."
(cd apps/web && npm run build)

echo "==> Installing mobile deps..."
(cd apps/mobile && npm install)

echo "==> Adding Android platform..."
(cd apps/mobile && npx cap add android)

echo "==> Syncing web build into Android project..."
(cd apps/mobile && npx cap sync android)

echo ""
echo "Done. Open Android Studio with:"
echo "  cd apps/mobile && npx cap open android"
echo ""
echo "For subsequent builds, just run:"
echo "  (cd apps/web && npm run build) && (cd apps/mobile && npx cap sync android)"
