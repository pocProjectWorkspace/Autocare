---
description: Run one full analyze → plan → build → verify → fix cycle against a module. Manual counterpart to the orchestrator's inner loop.
argument-hint: <package> "<task description>"
---

# /build-module — one supervised implementation cycle

You are executing **one iteration** of the autonomous build loop, but under human supervision (this is the interactive counterpart to `orchestrator.sh`).

## Arguments

Parse `$ARGUMENTS` as:
- `<package>` — one of `backend`, `mobile`, `web`
- `"<task description>"` — a natural-language task to accomplish in that package

If `$ARGUMENTS` is empty or malformed, ask the user for both.

## Cycle

Run these steps in order. Do NOT skip. Do NOT reorder.

### 1. Checkpoint

Before any edit, capture the current commit:

```
git rev-parse HEAD
```

Remember this SHA. If verification fails and cannot be recovered, rollback to it.

### 2. Plan

Invoke the `planner` subagent with the task description and the package. Wait for its plan. Show the plan to the user in a short summary and proceed (do not ask for approval — the user invoked the command).

### 3. Implement

Invoke the `implementer` subagent with the plan. It edits code and runs the fast smoke check.

### 4. Verify

Invoke the `verifier` subagent for the same package. It runs `bash .claude/autonomy/verify.sh <package>` and reports pass/fail with acceptance-criteria coverage.

### 5. Decide

- **VERDICT: PASS** → stage the changes with `git add -A`, commit with message `feat(<package>): <task summary>`, tell the user, done.
- **VERDICT: FAIL** or **PARTIAL** → send the verifier's failure report back to the implementer for one more attempt (max 2 tries total for the interactive command). If still failing, `git reset --hard <checkpoint SHA>`, `git clean -fd`, tell the user what failed, done.

## Guardrails

- Never commit with `--no-verify` or `--no-gpg-sign`.
- Never `git push` — this command is local-only.
- Never touch files outside the named package.
- If the verifier reports an error you can't explain in one sentence, stop and hand back to the user rather than guessing at a fix.
