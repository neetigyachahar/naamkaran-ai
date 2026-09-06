#!/usr/bin/env bash
# Idempotent Cloud Agent bootstrap for the Naamkaran monorepo.
# Installs the pinned Bun toolchain, refreshes workspace + Cloud Functions
# dependencies, builds every package, and prepares a local emulator env file.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

BUN_VERSION="1.3.10"
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Install the pinned Bun release when it is missing or on the wrong version.
if [ ! -x "$BUN_INSTALL/bin/bun" ] || [ "$("$BUN_INSTALL/bin/bun" --version 2>/dev/null)" != "$BUN_VERSION" ]; then
  curl -fsSL https://bun.sh/install | bash -s "bun-v${BUN_VERSION}"
fi

# Workspace dependencies (apps/web + packages/*) and root tooling (turbo, firebase-tools).
# The committed lockfile predates apps/functions being removed from the Bun
# workspaces, so a plain (non-frozen) install lets Bun reconcile it.
bun install

# apps/functions is a standalone npm project (deployed to Firebase, not a Bun workspace).
(cd apps/functions && npm ci)

# Build shared schemas + web client (turbo) and the Cloud Functions bundle (esbuild).
bun run build
(cd apps/functions && bun run build)

# Local web env so the SPA talks to the Firebase Functions emulator.
# Never clobber a developer-provided file.
if [ ! -f apps/web/.env ]; then
  cp apps/web/.env.example apps/web/.env
  sed -i 's/^VITE_USE_FIREBASE_EMULATOR=.*/VITE_USE_FIREBASE_EMULATOR=true/' apps/web/.env
fi

echo "Naamkaran install complete."
