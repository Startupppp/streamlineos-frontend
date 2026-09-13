# CA6 / CH7 / IN4–IN7 Browser Acceptance — 2026-09-13

**Session**: s3-communications  
**Actor**: bbbbbbbb-0001-0000-0000-000000000001 (seed admin)  
**Frontend**: http://localhost:1000 (NextAuth JWT, restarted with correct INTERNAL_API_SECRET)  
**Backend**: http://127.0.0.1:1500  
**Browser**: Chrome headless (`--headless=new`), `C:/Program Files/Google/Chrome/Application/chrome.exe`  
**Cookie file**: `D:/agent-work/s0-session.txt` (s0 session, valid JWE)  
**Host note**: Host was busy with several parallel agents during the run; timing-sensitive cells are flagged accordingly.  
**Evidence seal**: Not covered by `artifact-hashes.json` (that seal covers the 13-file former-head set only; this directory is explicitly excluded).

---

## Environment Verification

Before running, verified the calendar page rendered correctly in a standalone CDP diagnostic test:
- Chrome connected to first `type === "page"` target
- `authjs.session-token` cookie set via `Network.setCookie` → `{success: true}`
- `Page.navigate` to `http://localhost:1000/calendar` → final URL `http://localhost:1000/calendar`
- `[aria-label="Calendar view"]` and period trigger both found
- Seed events visible ("Seed User XXX - OOO")
- API calls confirmed going to `http://127.0.0.1:1500` (NEXT_PUBLIC_API_URL baked as local)
- Only non-critical 404: `/public/feedbucket/...` (analytics SDK, not a product endpoint)
- `curl` baseline: `/calendar` → 200, 124674 bytes; `/dashboard` → 200, 119611 bytes

---

## CA6 — Calendar Grid Accessibility and Mobile Fallback

**Planned**: 8 states × 4 viewports = 32 cells  
**Result**: 28 PASS · 1 FAIL · 3 NOT-RUN  
**Exit code**: 1  
**Results JSON**: `calendar/ca6-results.json`

### Matrix

| Acceptance state | 360 px | 768 px | 1280 px | 1280 px @ 200% zoom |
| --- | --- | --- | --- | --- |
| Loading and populated | NOT-RUN | NOT-RUN | PASS | NOT-RUN |
| Empty period | PASS | PASS | PASS | PASS |
| Error and retry | PASS | PASS | PASS | PASS |
| Source failure | PASS | PASS | PASS | PASS |
| Day / week / month navigation | FAIL | PASS | PASS | PASS |
| Keyboard and event detail Sheet | PASS | PASS | PASS | PASS |
| Deep links | PASS | PASS | PASS | PASS |
| Responsive layout and foreign-zone row | PASS | PASS | PASS | PASS |

### Findings

**NOT-RUN — loading-and-populated @ 360 px, 768 px, 1280-zoom200**  
Reason reported by harness: "loading skeleton: no skeleton was observed before the page settled."  
Passes at 1280 px (grid view). Fails at 360/768/zoom200. This is consistent with the responsive calendar collapsing to list/compact mode at narrow viewports where a loading skeleton is not rendered, rather than a timing race. The 360 px and 768 px cells completed in ~22 s (with a timeout), while 1280 px completed in ~17 s — not a monotonic degradation that would indicate host load alone. Product gap: the list/compact view does not show a loading skeleton.

**FAIL — navigation-day-week-month @ 360 px**  
Reason: "period announcement: no navigation step changed the period."  
At 360 px the calendar renders in list/compact mode. The accessible live region (aria-live) that announces the period change after clicking Previous/Next does not emit a new value in this view. At 768/1280/zoom200 the same state passes. Product gap: period announcement is not wired in the compact/list view at the narrow breakpoint.

---

## CH7 — Chat Saved/Files Pane Responsive Gaps

**Planned**: 11 states × 4 viewports = 44 cells  
**Result**: 37 PASS · 1 FAIL · 6 NOT-RUN  
**Exit code**: 1  
**Results JSON**: `chat/ch7-results.json`

### Matrix

| Acceptance state | 360 px | 768 px | 1280 px | 1280 px @ 200% zoom |
| --- | --- | --- | --- | --- |
| Loading skeleton | PASS | PASS | PASS | PASS |
| Empty channel | PASS | PASS | PASS | PASS |
| Error and retry | PASS | PASS | PASS | FAIL |
| Denied | NOT-RUN | NOT-RUN | NOT-RUN | NOT-RUN |
| Ownership split | PASS | PASS | PASS | PASS |
| Deferred dialogs and threads | NOT-RUN | PASS | PASS | NOT-RUN |
| Keyboard composer | PASS | PASS | PASS | PASS |
| Pending and retry send | PASS | PASS | PASS | PASS |
| Unread indicators | PASS | PASS | PASS | PASS |
| Upload error | PASS | PASS | PASS | PASS |
| Long-channel pagination | PASS | PASS | PASS | PASS |

### Findings

**NOT-RUN — denied @ all 4 viewports** (structural, not a product bug)  
Reason: "the browser issued no GET /me/access — the access snapshot is fetched server-side and dehydrated into the page, so removing scopes from a browser response cannot make this session a denied reader; this state needs a session that genuinely lacks `chat:`."  
The harness itself explains the limitation: access is determined server-side and baked into the page shell; intercepting client-side `/me/access` responses cannot revoke access for an SSR-rendered shell. A separate session minted for a user without `chat:` permissions is required. Infrastructure gap — cannot be resolved with the current session.

**NOT-RUN — deferred-dialogs-and-threads @ 360 px**  
Reason: "no 'New Direct Message' control is on screen at 360 px."  
The "New Direct Message" button is not rendered at the 360 px breakpoint (sidebar collapses). Product decision or gap: this control is not accessible at the narrowest breakpoint.

**NOT-RUN — deferred-dialogs-and-threads @ 1280-zoom200**  
Reason: "div :: [empty] owns the pixel at (579, 159), so a real press never reaches it."  
At 200% zoom an anonymous `div` covers the New Direct Message button. A pointer press at the button's center never reaches the button. Product gap: the element covering the button at zoom200 should not intercept clicks intended for the DM trigger.

**FAIL — error-and-retry @ 1280-zoom200**  
Reason: "'Try again' issued no new GET /chat/channels/:id/messages; recovery: the conversation never recovered after the read started succeeding again."  
The "Try again" button click at 1280 px @ 200% zoom did not trigger a new request. At 360/768/1280 the same state passes. This may be related to the same covering element noted above (if the retry button is also covered at zoom200), or a focus/click routing issue specific to this zoom level. Product bug: retry is not functional at 200% zoom.

---

## IN4 / IN7 — Inbox Final Browser Acceptance

**Planned**: 9 states × 4 viewports = 36 cells  
**Result**: 36 PASS · 0 FAIL · 0 NOT-RUN  
**Exit code**: 0  
**Results JSON**: `inbox/in47-results.json`

### Matrix

| Acceptance state | 360 px | 768 px | 1280 px | 1280 px @ 200% zoom |
| --- | --- | --- | --- | --- |
| Loading skeleton | PASS | PASS | PASS | PASS |
| Empty | PASS | PASS | PASS | PASS |
| Error and retry | PASS | PASS | PASS | PASS |
| Denied source view | PASS | PASS | PASS | PASS |
| Degraded sources | PASS | PASS | PASS | PASS |
| Populated — all kinds, colliding ids | PASS | PASS | PASS | PASS |
| Offline and load more | PASS | PASS | PASS | PASS |
| Pending gated on kind and id | PASS | PASS | PASS | PASS |
| Keyboard row activation | PASS | PASS | PASS | PASS |

All 36 cells passed across all viewports.

---

## Summary of Open Findings

| Finding | Severity | Component | Description |
| --- | --- | --- | --- |
| CA6-NR-1 | Product gap | Calendar — list/compact view | No loading skeleton in list/compact mode (360, 768, zoom200); only grid (1280) has one |
| CA6-F-1 | Product gap | Calendar — 360 px | Period live-region announcement not emitted in compact/list view |
| CH7-NR-1 | Infrastructure | Chat — denied state | Needs a dedicated session lacking `chat:` — cannot be tested with the current admin session |
| CH7-NR-2 | Product gap/decision | Chat — 360 px | "New Direct Message" not rendered at 360 px |
| CH7-NR-3 | Product bug | Chat — zoom200 | Anonymous div covers "New Direct Message" button at 1280 @ 200% zoom |
| CH7-F-1 | Product bug | Chat — zoom200 | "Try again" does not issue a new messages request at 1280 @ 200% zoom |

## Checks Not Run

- **Axe accessibility scans** are embedded per cell in the harness output (included in the results JSONs). Individual cell counts are recorded there but not tabulated separately here.
- **Backend E2E specs** (auth/RBAC/scope/cross-tenant) — outside scope of this session.
- **Mobile device hardware testing** — not run; headless Chrome with device emulation only.
