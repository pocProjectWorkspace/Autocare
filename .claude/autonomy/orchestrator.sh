#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# orchestrator.sh — headless autonomous loop.
#
# Reads tasks/modules.md, iterates over each module task,
# invokes planner → implementer → verifier in headless mode,
# commits on success, rolls back on failure. Never touches
# main; always works on a checkpoint branch.
#
# Guardrails:
#   - Checkpoint branch is created before any edits
#   - Per-task iteration cap (default 3 tries)
#   - Global wall-clock cap (default 30 min)
#   - --allowedTools passed explicitly to every claude call
#   - Never uses --dangerously-skip-permissions
#   - PreToolUse hook still enforced (destructive git blocked)
#
# Usage:
#   bash .claude/autonomy/orchestrator.sh
#   bash .claude/autonomy/orchestrator.sh --worktree     # isolate in a git worktree
#   bash .claude/autonomy/orchestrator.sh --task 3       # run only task #3
#   bash .claude/autonomy/orchestrator.sh --max-tries 5  # override retry cap
#
# Requires: `claude` CLI on PATH.
# ─────────────────────────────────────────────────────────────
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

# ── config (env overrides supported) ──
MAX_TRIES="${MAX_TRIES:-3}"
MAX_WALL_SECONDS="${MAX_WALL_SECONDS:-1800}"        # 30 min total
PER_CALL_TIMEOUT="${PER_CALL_TIMEOUT:-600}"          # 10 min per subagent call
MAX_TOKENS_PER_TURN="${MAX_TOKENS_PER_TURN:-100000}" # advisory; enforced by cost, not code
MODULES_FILE="${MODULES_FILE:-tasks/modules.md}"
USE_WORKTREE="false"
ONLY_TASK=""

# ── args ──
while [[ $# -gt 0 ]]; do
  case "$1" in
    --worktree) USE_WORKTREE="true"; shift ;;
    --task)     ONLY_TASK="$2"; shift 2 ;;
    --max-tries) MAX_TRIES="$2"; shift 2 ;;
    -h|--help)
      grep -E '^# ' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

# ── preflight ──
command -v claude >/dev/null 2>&1 || { echo "claude CLI not on PATH" >&2; exit 1; }
[[ -f "$MODULES_FILE" ]] || { echo "no module manifest at $MODULES_FILE — create one first (see .claude/autonomy/README.md)" >&2; exit 1; }
[[ -z "$(git status --porcelain)" ]] || { echo "working tree not clean — commit or stash before running orchestrator" >&2; exit 1; }

# ── branch / worktree setup ──
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BRANCH="autonomy/$TIMESTAMP"

if [[ "$USE_WORKTREE" == "true" ]]; then
  WORKTREE_DIR="../autocare-autonomy-$TIMESTAMP"
  git worktree add -b "$BRANCH" "$WORKTREE_DIR"
  echo ">> working in worktree: $WORKTREE_DIR"
  cd "$WORKTREE_DIR"
else
  git checkout -b "$BRANCH"
  echo ">> working on branch: $BRANCH"
fi

CHECKPOINT_SHA="$(git rev-parse HEAD)"
LOG_DIR=".claude/autonomy/runs/$TIMESTAMP"
mkdir -p "$LOG_DIR"
echo ">> logs: $LOG_DIR"

# ── shared allowed-tools sets ──
PLANNER_TOOLS="Read Grep Glob Bash"
IMPLEMENTER_TOOLS="Read Edit Write Grep Glob Bash"
VERIFIER_TOOLS="Read Grep Bash"

# ── helpers ──
elapsed() { echo $(( $(date +%s) - START_TIME )); }
budget_left() {
  local used
  used=$(elapsed)
  echo $(( MAX_WALL_SECONDS - used ))
}
budget_exceeded() {
  [[ $(budget_left) -le 0 ]]
}

# Invoke Claude Code in headless mode with a specific subagent.
# $1 = subagent name (planner|implementer|verifier)
# $2 = prompt text
# $3 = allowed tools (space-separated)
# $4 = log-file suffix
call_agent() {
  local agent="$1"
  local prompt="$2"
  local tools="$3"
  local logsuffix="$4"

  local logfile="$LOG_DIR/${logsuffix}.log"
  echo ">>> [$agent] $logsuffix (budget: $(budget_left)s left)"

  # Headless invocation. --print exits after one turn; the subagent
  # is invoked via the /agent directive at the start of the prompt.
  timeout "$PER_CALL_TIMEOUT" claude \
    --print \
    --allowedTools "$tools" \
    --output-format text \
    "Use the $agent subagent. $prompt" \
    > "$logfile" 2>&1
  local rc=$?

  if [[ $rc -eq 124 ]]; then
    echo "!!! [$agent] timed out after ${PER_CALL_TIMEOUT}s"
    return 124
  fi
  if [[ $rc -ne 0 ]]; then
    echo "!!! [$agent] exited $rc — see $logfile"
    return $rc
  fi

  echo "    [$agent] ok"
  return 0
}

# Rollback the working tree to $CHECKPOINT_SHA (or to $1 if provided).
rollback() {
  local target="${1:-$CHECKPOINT_SHA}"
  echo "!! rolling back to $target"
  git reset --hard "$target" >/dev/null 2>&1 || true
  git clean -fd >/dev/null 2>&1 || true
}

# ── main loop ──
START_TIME=$(date +%s)
PASSED=0
FAILED=0
SKIPPED=0

# Parse tasks — each `## Task N:` heading in modules.md starts a task.
# The body until the next `## Task` is the task spec.
readarray -t TASK_HEADINGS < <(grep -nE '^## Task [0-9]+:' "$MODULES_FILE" | awk -F: '{print $1}')
TOTAL="${#TASK_HEADINGS[@]}"

if [[ $TOTAL -eq 0 ]]; then
  echo "no tasks found in $MODULES_FILE (expected '## Task N:' headings)"
  exit 1
fi

echo ">> found $TOTAL task(s) in $MODULES_FILE"

for i in "${!TASK_HEADINGS[@]}"; do
  TASK_NUM=$((i + 1))
  [[ -n "$ONLY_TASK" && "$TASK_NUM" != "$ONLY_TASK" ]] && continue
  budget_exceeded && { echo "!! wall-clock budget exhausted — stopping"; break; }

  START_LINE="${TASK_HEADINGS[$i]}"
  END_LINE=$([[ $((i + 1)) -lt $TOTAL ]] && echo "$((${TASK_HEADINGS[$((i + 1))]} - 1))" || wc -l < "$MODULES_FILE")
  TASK_SPEC="$(sed -n "${START_LINE},${END_LINE}p" "$MODULES_FILE")"
  # Try to sniff the package from the spec (first "Package:" line)
  PACKAGE="$(echo "$TASK_SPEC" | grep -m1 -oE 'Package: *(backend|mobile|web)' | awk '{print $2}')"
  PACKAGE="${PACKAGE:-backend}"

  echo ""
  echo "========================================================================"
  echo "TASK $TASK_NUM (package: $PACKAGE)"
  echo "========================================================================"

  PRE_TASK_SHA="$(git rev-parse HEAD)"
  TASK_LOG_DIR="$LOG_DIR/task-$TASK_NUM"
  mkdir -p "$TASK_LOG_DIR"
  echo "$TASK_SPEC" > "$TASK_LOG_DIR/spec.md"

  # ── planner (one attempt) ──
  PLAN_PROMPT="Read the task spec from $TASK_LOG_DIR/spec.md and produce an implementation plan following your subagent instructions."
  call_agent planner "$PLAN_PROMPT" "$PLANNER_TOOLS" "task-$TASK_NUM/1-plan" || {
    echo "!! planner failed — skipping task $TASK_NUM"
    SKIPPED=$((SKIPPED + 1))
    rollback "$PRE_TASK_SHA"
    continue
  }
  PLAN="$(cat "$LOG_DIR/task-$TASK_NUM/1-plan.log")"

  # ── implementer + verifier loop (up to MAX_TRIES) ──
  TASK_PASSED="false"
  for TRY in $(seq 1 "$MAX_TRIES"); do
    budget_exceeded && { echo "!! wall-clock budget exhausted mid-task"; break; }
    echo ">> task $TASK_NUM, try $TRY/$MAX_TRIES"

    IMPL_PROMPT="Execute this plan for the $PACKAGE package:\n\n$PLAN"
    call_agent implementer "$IMPL_PROMPT" "$IMPLEMENTER_TOOLS" "task-$TASK_NUM/${TRY}-impl" || {
      echo "!! implementer errored — rollback + retry"
      rollback "$PRE_TASK_SHA"
      continue
    }

    VERIFY_PROMPT="Verify the changes for the $PACKAGE package against these acceptance criteria:\n\n$PLAN"
    if call_agent verifier "$VERIFY_PROMPT" "$VERIFIER_TOOLS" "task-$TASK_NUM/${TRY}-verify"; then
      # Check if the verifier's output starts with 'VERDICT: PASS'
      if grep -qE '^VERDICT: *PASS' "$LOG_DIR/task-$TASK_NUM/${TRY}-verify.log"; then
        TASK_PASSED="true"
        break
      fi
      echo "!! verifier reports non-PASS — see $LOG_DIR/task-$TASK_NUM/${TRY}-verify.log"
    fi

    echo "!! try $TRY failed — rolling back + retrying"
    rollback "$PRE_TASK_SHA"
  done

  if [[ "$TASK_PASSED" == "true" ]]; then
    git add -A
    git -c commit.gpgsign=false commit -m "autonomy: task $TASK_NUM ($PACKAGE) — $(echo "$TASK_SPEC" | head -1 | sed 's/^## //')" >/dev/null
    echo ">> task $TASK_NUM committed"
    PASSED=$((PASSED + 1))
  else
    echo "!! task $TASK_NUM failed after $MAX_TRIES tries — rolled back"
    FAILED=$((FAILED + 1))
  fi
done

# ── summary ──
echo ""
echo "========================================================================"
echo "orchestrator done in $(elapsed)s"
echo "  passed:  $PASSED"
echo "  failed:  $FAILED"
echo "  skipped: $SKIPPED"
echo "  branch:  $BRANCH"
[[ "$USE_WORKTREE" == "true" ]] && echo "  worktree: $WORKTREE_DIR"
echo "  logs:    $LOG_DIR"
echo "========================================================================"
