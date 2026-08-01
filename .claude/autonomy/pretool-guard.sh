#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# pretool-guard.sh — invoked from the PreToolUse Bash hook.
# Reads the pending command from stdin (Claude Code passes tool
# input as JSON) and blocks obviously-dangerous commands even
# if the permission allowlist would let them through.
#
# Exit codes:
#   0     allow (default)
#   2     block, with reason on stderr (Claude sees it)
# ─────────────────────────────────────────────────────────────
set -uo pipefail

INPUT="$(cat)"
# Extract the command field from the tool JSON — fall back to raw input.
CMD="$(printf '%s' "$INPUT" | python -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null || printf '%s' "$INPUT")"

# Patterns that are always blocked, no matter the allowlist
BLOCKED=(
  'git push --force'
  'git push -f '
  'git reset --hard main'
  'git reset --hard origin/main'
  'git reset --hard HEAD~'
  'git branch -D '
  '--no-verify'
  '--no-gpg-sign'
  'rm -rf /'
  'rm -rf ~'
  'rm -rf ..'
  'rm -rf D:'
  'rm -rf /d/Project/Autocare'
  'chmod -R 777'
  'curl.*|.*bash'
  'wget.*|.*bash'
)

for pat in "${BLOCKED[@]}"; do
  if echo "$CMD" | grep -qE "$pat"; then
    echo "pretool-guard: blocked by pattern '$pat' — command was: $CMD" >&2
    exit 2
  fi
done

exit 0
