#!/usr/bin/env bash
# Punto único de verificación canónico para Atlas
# Uso idéntico en local y en CI: bash scripts/verify.sh [--fast]

set -e
node scripts/verify.mjs "$@"
