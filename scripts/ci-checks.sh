#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export CI=1

run_step() {
  local name="$1"
  shift

  printf '\n==> %s\n' "$name"
  "$@"
}

run_step "Install dependencies (frozen lockfile)" pnpm install --frozen-lockfile --prefer-offline
run_step "Lint" pnpm lint
run_step "Build" pnpm build
run_step "Test" pnpm test

if [[ "${1:-}" == "--with-audit" ]]; then
  run_step "Audit dependencies" pnpm audit --audit-level=high
fi

printf '\nAll CI checks passed.\n'
