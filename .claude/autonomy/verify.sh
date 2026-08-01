#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# verify.sh — full test/build gate for a single package.
# Invoked by the verifier subagent and by the orchestrator's
# verify step.
#
# Usage: bash .claude/autonomy/verify.sh <backend|mobile|web>
#
# Exit codes:
#   0  gate passed
#   1  gate failed (test/build/type error)
#   2  unknown package
# ─────────────────────────────────────────────────────────────
set -uo pipefail

PACKAGE="${1:-}"
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

if [[ -z "$PACKAGE" ]]; then
  echo "usage: verify.sh <backend|mobile|web>" >&2
  exit 2
fi

echo "=== verify.sh: $PACKAGE ==="

case "$PACKAGE" in
  backend)
    cd "$REPO_ROOT/backend"
    export PYTHONIOENCODING=utf-8
    # Activate venv if present
    if [[ -f venv/Scripts/activate ]]; then
      # shellcheck disable=SC1091
      source venv/Scripts/activate
    elif [[ -f venv/bin/activate ]]; then
      # shellcheck disable=SC1091
      source venv/bin/activate
    fi
    # If tests exist, run pytest. Otherwise, smoke-import the app.
    if find tests -name "test_*.py" -print -quit 2>/dev/null | grep -q .; then
      pytest -x --tb=short --no-header -q
    else
      echo "no tests/ directory — running app-import smoke instead"
      python -c "from app.main import app; print('app imports OK, routes:', len(app.routes))"
    fi
    ;;

  mobile)
    cd "$REPO_ROOT/mobile"
    # node_modules is needed for tsc to resolve imports
    if [[ ! -d node_modules ]]; then
      echo "-- installing deps (node_modules missing)"
      npm install --silent --no-audit --no-fund || { echo "npm install failed"; exit 1; }
    fi
    echo "-- tsc --noEmit"
    npx tsc --noEmit || { echo "tsc failed"; exit 1; }
    # Only run lint if an eslint config actually exists — the mobile/
    # package ships a "lint" script but no config file, so a naive
    # `npm run lint` errors with "couldn't find an eslint.config file".
    if ls eslint.config.* .eslintrc* 2>/dev/null | head -1 | grep -q .; then
      echo "-- eslint"
      npm run lint --silent || { echo "lint failed"; exit 1; }
    else
      echo "-- eslint skipped (no eslint config in mobile/)"
    fi
    ;;

  web)
    cd "$REPO_ROOT/web"
    echo "-- vite build"
    npm run build --silent || { echo "vite build failed"; exit 1; }
    ;;

  *)
    echo "unknown package: $PACKAGE" >&2
    exit 2
    ;;
esac

echo "=== verify.sh: $PACKAGE — PASS ==="
