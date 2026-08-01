# Autonomous mode — how it works

This directory turns the AutoCare repo into a project you can run Claude Code
against **unattended**: pick tasks from `tasks/modules.md`, plan/implement/verify
each one in a loop, commit passes, roll back failures, stop when the budget is up.

## The pieces

```
.claude/
├── settings.json              ← hooks + minimal allowlist (project-scoped, checked in)
├── agents/
│   ├── planner.md             ← subagent: read-only, produces plans
│   ├── implementer.md         ← subagent: writes code, one package at a time
│   └── verifier.md            ← subagent: runs the gate, reports pass/fail
├── commands/
│   └── build-module.md        ← /build-module — one supervised cycle
└── autonomy/
    ├── orchestrator.sh        ← the loop: unsupervised, headless
    ├── smoke.sh               ← fast per-file syntax check (invoked from PostToolUse hook)
    ├── verify.sh              ← full test/build gate per package
    ├── pretool-guard.sh       ← blocks destructive bash commands (PreToolUse)
    └── runs/                  ← per-run logs land here
tasks/
└── modules.md                 ← the work list — orchestrator's input
```

## Two modes

### Interactive: `/build-module`
For when you're at the keyboard and want to hand off one task at a time.

```
/build-module backend "add page/page_size query params to /api/vehicles"
```

The `/build-module` slash command runs planner → implementer → verifier once,
commits on pass, rolls back on fail, tells you what happened. Two retry attempts max.

### Headless: `orchestrator.sh`
For overnight runs, CI, or cron. Reads every task in `tasks/modules.md` and processes
them in order.

```bash
# from repo root
bash .claude/autonomy/orchestrator.sh                    # normal run on new branch
bash .claude/autonomy/orchestrator.sh --worktree         # isolate in a git worktree
bash .claude/autonomy/orchestrator.sh --task 3           # only task #3
bash .claude/autonomy/orchestrator.sh --max-tries 5      # retry cap per task
MAX_WALL_SECONDS=3600 bash .claude/autonomy/orchestrator.sh   # 60-min budget
```

## Guardrails baked in

| Guardrail | Where |
|---|---|
| Checkpoint branch before any edit | `orchestrator.sh` creates `autonomy/YYYY-MM-DD-HHMMSS` |
| Rollback on failure | `git reset --hard <checkpoint>` per-task if verifier fails after retries |
| Minimal `--allowedTools` per subagent | `PLANNER_TOOLS`, `IMPLEMENTER_TOOLS`, `VERIFIER_TOOLS` in orchestrator |
| Test suite as validation gate | `verify.sh` — pytest / tsc+lint / vite build |
| Token/timeout limits | `PER_CALL_TIMEOUT=600s` per subagent call, `MAX_WALL_SECONDS=1800s` total |
| Iteration cap per module | `MAX_TRIES=3` per task |
| Isolated branch / worktree option | `--worktree` flag creates `../autocare-autonomy-*` |
| No `--dangerously-skip-permissions` | Never used. Full permission enforcement even in headless mode. |
| Destructive bash blocked | `pretool-guard.sh` denies `--no-verify`, `git push --force`, `rm -rf D:`, etc. |
| Working tree must be clean | Orchestrator refuses to start otherwise |

## Writing good tasks

The orchestrator succeeds when tasks are:

- **Small** — one to five files, single package
- **Verifiable** — acceptance criteria that a test, build, or curl can check
- **Isolated** — no shared state with pending tasks (each task commits atomically)
- **Explicit about scope** — a well-written "Out of scope" line prevents the implementer from wandering

Bad tasks look like: "improve the payment flow", "make it faster", "add tests everywhere". Good tasks are what you'd write in a PR title.

## Killing a run

`Ctrl+C` at the terminal running `orchestrator.sh`. The current subagent call may take up to `PER_CALL_TIMEOUT` seconds to actually die. The branch is left in place so you can inspect logs and either resume, cherry-pick the passing commits, or delete the branch.

## Logs

Every run writes to `.claude/autonomy/runs/<timestamp>/`:

```
runs/20260802-093015/
├── task-1/
│   ├── spec.md          ← the task as read from modules.md
│   ├── 1-plan.log       ← planner output
│   ├── 1-impl.log       ← implementer output (try 1)
│   ├── 1-verify.log     ← verifier output (try 1)
│   ├── 2-impl.log       ← (if try 1 failed)
│   └── 2-verify.log
└── task-2/ ...
```

These are gitignored so they don't clutter commits. Delete them any time.

## MCP

Not used for the core loop. The analyze → plan → build → verify cycle is served entirely by subagents + hooks + `CLAUDE.md`. Add an MCP server later only if you need external integrations (GitHub PRs, Jira, external DB). See the article this pattern is based on for the reasoning.

## When it goes wrong

- **Verifier always reports FAIL** → check `verify.sh` runs cleanly by hand: `bash .claude/autonomy/verify.sh backend`. If it fails outside the loop, fix that first.
- **Implementer wanders outside the package** → the plan is probably too vague. Tighten the "Files (expected)" and "Out of scope" fields.
- **Orchestrator won't start** → working tree isn't clean (`git status`). Commit or stash first.
- **Every task fails after 3 tries** → tasks are too large. Split them.
- **You want to inspect what an agent did** → read the log files in `runs/`, especially the verifier's report.

## What this is NOT

- Not a magic "build me a feature" button. It's a supervised construction system that only works when tasks are well-specified.
- Not a replacement for code review. Every autonomy branch is meant to be reviewed as a PR before merging to main.
- Not a way to bypass CI. The verify.sh gate is a floor, not a ceiling — your CI should still run.
