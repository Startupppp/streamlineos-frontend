# Wave-G-14: Adversarial Tick Audit

Agent: G-14 · 2026-09-26

Scope: every acceptance box ticked (box 3, "C3") by any WAVE-B through WAVE-G status document in
`docs/build-module/lanes/status/`. Read every wave, cross-checked source and tests, ran targeted
jest suites. Governing rules: CCG-1 (no optimistic concurrency → Conflict excused), CCG-4 (no
shortcut when target absent), CCG-5 (offline hook exists; lanes that called it a project-wide gap
are wrong), CCG-6 (74 boilerplate settings pages judged on load-bearing sections).

---

## Ranked findings — unticks first

| Spec file | Box | Wave that ticked | Failing item | Evidence |
|---|:---:|---|---|---|
| `10-settings-access.md` | 3 | WAVE-F-08 | `j/k` and `/` keyboard shortcuts claimed "✓ (NEW) tested" but no test exists for `itemCount` wiring or `searchInputRef` wiring | `members-page.test.tsx` run: 10 tests, keyboard describe covers only `?` (`onShortcutHelp`) and `c` (`onCreate`); no test asserts `itemCount` or `searchInputRef` |
| `10-managed-products-product-goals.md` | 3 | WAVE-E-02 | Offline state required by spec; `product-goals-page.tsx` has no `useOnlineStatus`; wave falsely claimed "P2 project-wide gap" — CCG-5 explicitly prohibits this defence | `product-goals-page.test.tsx` run: 14 tests, zero offline; `grep useOnlineStatus product-goals-page.tsx` → no output |
| `10-managed-products-product.md` | 3 | WAVE-B-08 | Same offline gap — `managed-products-page.tsx` has no `useOnlineStatus`; wave acknowledged "P2 rows (offline, conflict) acknowledged" which CCG-5 disallows | `managed-products-page.test.tsx` run: 5 tests, zero offline; `grep useOnlineStatus managed-products-page.tsx` → no output |
| `10-project-settings-agents.md` | 3 | WAVE-B-03 | Offline state required by spec, not implemented, silently omitted from the row table | `project-settings-agents-page.test.tsx` run: 8 tests (keyboard + access only), zero offline; `grep useOnlineStatus project-settings-agents-page.tsx` → no output |
| `10-project-settings-agents-credentials.md` | 3 | WAVE-B-03 | Same — credentials page has no offline state | `project-settings-credentials-page.test.tsx` run: 5 tests (access + page title only), zero offline; `grep useOnlineStatus project-settings-credentials-page.tsx` → no output |

All five unticks have been applied (boxes changed from `[x]` to `[ ]` in the spec files).

---

## Ticks that stand

| Spec file | Box | Wave | Verdict | Key check |
|---|:---:|---|---|---|
| `10-inbox.md` | 3 | WAVE-F-02 | STANDS | `use-inbox-url-state.ts:75` reads `projectId` param and forwards to `useInfiniteNotifications`; not a dead param; `inbox-offline-and-chat-gap.test.tsx` covers offline; 14 suites / 132 tests pass |
| `10-settings-integrations.md` | 3 | WAVE-F-08 | STANDS | `search` param drives client-side filter on a non-paginated list — not a dead param, not a FE-105 violation; offline wired and tested (INT-019); `itemCount` test exists at line 293 of `git-integration-settings.test.tsx` |
| `10-project-settings-automations.md` | 3 | WAVE-G-02 | STANDS | `automations-page.test.tsx`: 29 tests; offline describe exists: "shows You are offline in the empty state when the device is offline" and positive pair both pass |
| `10-project-settings-fields.md` | 3 | WAVE-F-06 | STANDS | `project-settings-fields-page.tsx` wires `useOnlineStatus`; 2 offline tests added this session |
| `10-project-settings-core.md` | 3 | WAVE-F-06 | STANDS | `project-settings-page.tsx` wires `useOnlineStatus`; 2 offline tests added this session |
| `10-settings-access.md` (org webhooks) | 3 | WAVE-F-07 | STANDS | `project-webhooks-page.tsx` has `useOnlineStatus`; WH-032 offline tests pass |
| Members / access shell | — | WAVE-F-08 (section routing) | STANDS | `access-shell.test.tsx`: 7 tests for `section` URL param routing and tab switching — all pass |

---

## Waves audited but no C3 ticks claimed

WAVE-C-01 through C-05, WAVE-D-01: these waves contain PageState adoption, test-doubling fixes,
and C6 gallery work. None claimed a box-3 tick in any 10-*.md spec file.

WAVE-B-01 (project-settings-core), WAVE-B-02 (views-workflow), WAVE-B-04 (integrations-webhooks),
WAVE-B-05 (automations), WAVE-B-06 (iterations-cycles), WAVE-B-07 (retention), WAVE-B-09 through
B-13: none contain "C3 verdict: TICKED" for a spec file — these waves were scoped to C1/C2 census
and C4/C5 bounds work.

WAVE-E-01 (command-centre-inbox): command-center-page.tsx has `useOnlineStatus`; inbox offline
covered by `inbox-offline-and-chat-gap.test.tsx`. Tick stands if claimed (C3 verdict grep returned
no match — wave may not have ticked it; no untick applied).

WAVE-E-06, WAVE-E-07, WAVE-E-08: searched; only WAVE-E-06 registered in the C3 grep. WAVE-E-06
covers integrations page which WAVE-F-07 then properly re-addressed offline for — consistent.

---

## Failure pattern index

| Pattern | Instances found |
|---|---|
| Name claiming more than body (keyboard test names claim j/k coverage when no key is pressed) | 1 — `members-page.test.tsx` BLD-X-FE-ACCESS-011 |
| False-absence claim (offline called project-wide gap when hook exists) | 3 — WAVE-B-03 (×2), WAVE-B-08, WAVE-E-02 |
| Dead URL param | 0 found |
| Vacuous negative | 0 found in audited files |
| Client-side filtering presented as search | 1 disclosed but not concealed (integrations page); client-side filter is appropriate for a non-paginated small collection per CCG reasoning; not an untick |
| Field silently stripped | 0 found |

---

## Raw jest output for each unticked suite

### members-page.test.tsx (supports untick of `10-settings-access.md` box 3)

```
PASS features/build/members/members-page.test.tsx (12.204 s)
  MembersPage — keyboard shortcut wiring (BLD-X-FE-ACCESS-011)
    √ passes onShortcutHelp to useBuildListKeyboard so the ? key can open the help overlay (9 ms)
    √ passes onCreate to useBuildListKeyboard so the c key opens the add member dialog (60 ms)
    √ ShortcutHelpDialog is not shown on initial render (19 ms)
    √ the onShortcutHelp callback passed to the keyboard hook opens the help dialog (108 ms)
    √ shows the offline empty state when useOnlineStatus returns false and the list is empty (9 ms)
    √ does not show the offline state when online and the list is empty (25 ms)

Tests: 10 passed, 0 failed
```

No test for `itemCount` wiring. No test that `searchInputRef` is forwarded. WAVE-F-08 row table
claimed both `j/k` and `/` as "✓ (NEW) tested" — those rows have no test to back them.

### product-goals-page.test.tsx (supports untick of `10-managed-products-product-goals.md` box 3)

```
PASS features/build/managed-products/product-goals-page.test.tsx
Tests: 14 passed, 0 failed
```

14 tests: usePageState integration, permission denial, pagination, and five URL param forwarding
tests. Zero offline tests. `product-goals-page.tsx` has no `useOnlineStatus` import.

### managed-products-page.test.tsx (supports untick of `10-managed-products-product.md` box 3)

```
PASS features/build/managed-products/managed-products-page.test.tsx
Tests: 5 passed, 0 failed
```

5 tests: usePageState, permission denial, keyboard Enter navigation, display hook data. Zero offline
tests. `managed-products-page.tsx` has no `useOnlineStatus` import.

### project-settings-agents-page.test.tsx (supports untick of `10-project-settings-agents.md` box 3)

```
PASS features/build/settings/project-settings-agents-page.test.tsx (8.896 s)
  ProjectSettingsAgentsPage — keyboard shortcuts (Requirement C3)
    √ wires useBuildListKeyboard with onClearSelection so Esc clears the search filter (393 ms)
    √ passes searchInputRef to useBuildListKeyboard so the / key focuses the search input (10 ms)
  ProjectSettingsAgentsPage — access control (BLD-X-FE-SETTINGS-AGENTS-001)
    √ renders NoPermissionState when access is denied (102 ms)
    √ renders agent tokens when access is granted (148 ms)
    √ fails closed on loading (11 ms)
    √ shows page-loading state with skeleton (61 ms)
  ProjectSettingsAgentsPage — URL search filter (BLD-X-FE-SETTINGS-AGENTS-002)
    √ passes withSearch:true to useBuildListFilters (6 ms)
    √ BuildListToolbar receives the search value from URL-backed filters (42 ms)

Tests: 8 passed, 0 failed
```

8 tests: keyboard and access. Zero offline tests. `project-settings-agents-page.tsx` has no
`useOnlineStatus` import. Spec states: "Offline: show freshness; allow local drafts and approved
idempotent commands only."

### project-settings-credentials-page.test.tsx (supports untick of `10-project-settings-agents-credentials.md` box 3)

```
PASS features/build/settings/project-settings-credentials-page.test.tsx
Tests: 5 passed, 0 failed
```

5 tests: permission denial, granted render, loading, skeleton, page title. Zero offline tests.
`project-settings-credentials-page.tsx` has no `useOnlineStatus` import.
