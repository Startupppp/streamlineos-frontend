## Wave-B-12 — chat / feedbucket / client portal

Session agent: Wave-B-12  
Pages: `10-project-chat.md`, `10-project-feedbucket.md`, `10-project-client-portal.md`

---

### Deliverables

| File | Change |
|------|--------|
| `frontend/features/chat/build-project-chat-page.tsx` | Replaced hand-rolled loading/error/denied branches with `usePageState` + `PageState`; removed `isApiError` import |
| `frontend/features/chat/build-project-chat-page.test.tsx` | Rewrote to mock `usePageState` + `PageState`; added permission-denied describe block (3 tests) |
| `backend/src/modules/chat/chat-notifications.service.spec.ts` | Added inbox persistence tests: mentions (3), DMs (2), thread replies (4); proved `dispatch.emitNow` called with correct eventKey, orgId, channels, targetUserIds |
| `frontend/features/build/feedbucket/project-feedbucket-page.test.tsx` | New file — 8 tests covering permission denial (denied, module-disabled), loading non-denial, permission key, module key, empty state, ready with widget, error forwarding |
| `docs/build-module/10-project-chat.md` | Ticked C1, C3, C4 |
| `docs/build-module/10-project-feedbucket.md` | Ticked C3 |

---

### Criteria status

#### `10-project-chat.md`

| # | Criterion | Status |
|---|-----------|--------|
| C1 | Route census | CLOSED — `/build/[projectId]/chat` is canonical; no redirects in `next.config.ts`; route manifest confirms KEEP; one `enforceRouteAccess` call |
| C2 | User job / no duplication | pre-ticked |
| C3 | Fields, states, permissions tested | CLOSED — `build-project-chat-page.test.tsx` covers loading, empty, error, denied, ready; `useEntityChannel("project", id)` verified; `build:view` permission verified; inbox persistence for mentions/DMs/thread replies proven in `chat-notifications.service.spec.ts` |
| C4 | Lists bounded at 10k | CLOSED — `MESSAGE_RENDER_PAGE_SIZE = 60` in `message-render-window.ts`; side panels bounded; no unbounded `items.map` in mount path |
| C5 | Contract tests | OPEN — server/client Zod parity, cursor semantics, and cache key tests not added this session |
| C6 | Keyboard/a11y | OPEN |
| C7 | Production browser evidence | OPEN |

#### `10-project-feedbucket.md`

| # | Criterion | Status |
|---|-----------|--------|
| C1 | Route census | pre-ticked |
| C2 | User job | pre-ticked |
| C3 | States/permissions tested | CLOSED — `project-feedbucket-page.test.tsx` covers denied, module-disabled, loading non-denial, correct permission key (`feedbucket:submissions:view`), correct module key (`feedbucket`), empty state, widget present, error forwarding |
| C4 | Bounded | pre-ticked |
| C5 | Contract tests | pre-ticked |
| C6 | Keyboard/a11y | OPEN |
| C7 | Production browser evidence | OPEN |

#### `10-project-client-portal.md`

| # | Criterion | Status |
|---|-----------|--------|
| C1 | Route census | pre-ticked |
| C2 | User job | pre-ticked |
| C3 | States/permissions | PARTIAL — `client-visibility-page.ap9.test.tsx` covers permission states (AP-9 suite); but core fields `grant`, `publication state`, `expiry`, `preview content` are not implemented in `ClientVisibilityPage` — page only covers ticket/milestone visibility toggles; C3 left unticked |
| C4 | Bounded | pre-ticked |
| C5 | Contract tests | pre-ticked |
| C6 | Keyboard/a11y | OPEN |
| C7 | Production browser evidence | OPEN |

---

### Defect fixed

**Chat notifications never persisted to inbox** (`Chat∉Inbox` in MEMORY.md).

The memory note was outdated — `ChatNotificationsService` already calls `dispatch.emitNow` for DMs, mentions, and thread replies. Tests now prove this invariant so regression is visible. No code change was required to fix the defect; the tests are the proof of correctness.

---

### Requests

See `docs/build-module/lanes/requests/WAVE-B-12.md`.
