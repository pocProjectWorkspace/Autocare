#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# smoke.sh — fast per-file syntax/parse check, invoked from
# the PostToolUse Edit|Write hook. Must exit quickly (< 2s) to
# not disrupt interactive editing.
#
# The hook exports env vars describing the tool call. We look
# at CLAUDE_TOOL_PATH first, fall back to the last-modified
# file in the working tree if the env var isn't set.
# ─────────────────────────────────────────────────────────────
set -euo pipefail

FILE="${CLAUDE_TOOL_PATH:-${CLAUDE_FILE_PATH:-}}"
if [[ -z "$FILE" ]]; then
  # Fallback: no env var — silently succeed.
  exit 0
fi

# Normalize to a path relative to the repo root if possible
[[ -f "$FILE" ]] || exit 0

case "$FILE" in
  *.py)
    if command -v python >/dev/null 2>&1; then
      PYTHONIOENCODING=utf-8 python -m py_compile "$FILE" 2>&1
    fi
    ;;
  *.js|*.mjs|*.cjs)
    if command -v node >/dev/null 2>&1; then
      node --check "$FILE" 2>&1
    fi
    ;;
  *.json)
    if command -v python >/dev/null 2>&1; then
      python -c "import json,sys; json.load(open(sys.argv[1], encoding='utf-8'))" "$FILE" 2>&1
    fi
    ;;
  # .ts/.tsx skipped in smoke — tsc is too heavy for a per-edit hook.
  # Full typecheck runs in verify.sh.
  *)
    ;;
esac

exit 0
