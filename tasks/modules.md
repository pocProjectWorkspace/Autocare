# AutoCare — Module Manifest

This file is the **input** to the autonomous orchestrator (`.claude/autonomy/orchestrator.sh`).
Each `## Task N: ...` heading defines one unit of work. The orchestrator iterates over
them top-to-bottom, running planner → implementer → verifier for each.

## Task format

Every task must include these fields (as bulleted lines) so the planner and verifier
can act without ambiguity:

- **Package:** `backend` | `mobile` | `web`
- **Goal:** one sentence
- **Files (expected):** the paths you expect will change (may be empty if unknown)
- **Acceptance criteria:** bulleted, concrete, machine-checkable where possible
- **Out of scope:** what NOT to touch
- **Rollback risk:** low | medium | high

The orchestrator commits each passing task as its own git commit. Failing tasks are
rolled back and the run continues to the next task.

---

## Task 1: Add pagination to /vehicles endpoint

- **Package:** backend
- **Goal:** The `/api/vehicles` list endpoint currently returns all rows in one array. Add page + page_size query params so the web dashboard can lazy-load.
- **Files (expected):** `backend/app/api/vehicles.py`, `backend/app/schemas/vehicle.py`
- **Acceptance criteria:**
  - GET `/api/vehicles?page=1&page_size=20` returns `{ vehicles: [...], total: N, page: 1, page_size: 20 }`
  - Default page=1 and page_size=20 when omitted
  - page_size clamped to `[1, 100]`
  - Existing callers that omit params still work (backwards compatible)
  - `pytest -x` passes (or app import smoke passes if no tests)
- **Out of scope:** frontend consumption, sorting, filtering
- **Rollback risk:** low

---

## Task 2: Wire the web Vehicles page to real data

- **Package:** web
- **Goal:** The Vehicles page (`page-vehicles`) currently shows "Loading..." indefinitely because `loadVehicles()` calls the API but the endpoint returns empty. After Task 1, wire the pagination controls too.
- **Files (expected):** `web/js/app.js`
- **Acceptance criteria:**
  - `loadVehicles()` fetches `/vehicles?page=X&page_size=20`
  - Renders each row: plate, make/model, year, owner name, last-service date, action buttons
  - Pagination footer (`#prev-page`, `#next-page`) navigates pages
  - Empty state message when 0 vehicles
  - `npm run build` in `web/` succeeds
- **Out of scope:** styling changes, filter chips
- **Rollback risk:** low

---

## Task 3: Fix the pre-existing Button children bug in mobile

- **Package:** mobile
- **Goal:** `mobile/app/rfq/[id]/quote.tsx:113` passes children to `<Button>` which only accepts a `title` prop. Fix the call site to use `title` or update `Button` to accept children.
- **Files (expected):** `mobile/app/rfq/[id]/quote.tsx` (or `mobile/components/ui/Button.tsx`)
- **Acceptance criteria:**
  - `npx tsc --noEmit` in `mobile/` reports zero errors from this file
  - `npm run lint` passes
- **Out of scope:** redesigning the Button API
- **Rollback risk:** low

---

<!--
Add more tasks below by copying the format. Small, atomic tasks work best —
the orchestrator's success rate drops sharply for tasks touching >5 files.
-->
