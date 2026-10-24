# Chat product contract — pending closeout (CHAT-024 / CHAT-025)

Date: 2026-10-20 · Contract approved 2026-10-21 · Implementation (CHAT-001–023) done  
Sources: [reset plan](2026-10-20-product-chat-reset-plan.md), [ADR-0001](../../adr/0001-chat-realtime-is-server-published.md)

CHAT-001–023 (product shape, huddles, navigation, UI, security, tests) are complete and removed from this file. What remains is verification and rollout closeout.

---

## Pending

### CHAT-024 — Quality gates

Run and record a clean pass of the nested-backend and frontend gates. Browser journeys at 375 / 768 / 1280 (including offline/reconnect) already passed.

**What it should do**

1. In `backend/`: focused Jest, typecheck, lint, OpenAPI, migration, contract, tenant, idempotency, and Ably gates all pass.
2. In `frontend/`: focused Jest, type-check, lint, response-contract, permission, PageState, dead-code, file-size, and route-bundle gates all pass.
3. Results are recorded (CI or release notes) so CHAT-025 can treat the build as gate-clean.

**Done when**

- [ ] Backend gates above pass.
- [ ] Frontend gates above pass.

---

### CHAT-025 — Rollout and GA

Released to every org on 2026-10-21 (backend `0afa6f0b8`, frontend `6175f8726`); there is no cohort flag, so stages are observation windows on the whole population. Baseline snapshot (2026-10-21, all orgs, last 7 days) was too low-volume for percentage gates; each window needs ≥1,000 sends and ≥50 Huddle starts before it can pass.

| Window | Length | Hold | Roll back |
|---|---|---|---|
| Internal | 3 days | Every release gate | Any leak, loss/duplication, broken legacy link |
| Agency/service pilots | 7 days | Every release gate; pilot task completion ≥ 90% | As above, or task completion drops > 10 points |
| Staged release | 14 days | Every release gate | As above, or provider cleanup backlog > 24h |
| GA | — | All gates held for the full staged window | — |

Rollback order: frontend first, then backend. Migrations 2490/2495/2500 are additive and stay.

**Release gates to hold**

- Message-send success ≥ 99.9%; p95 send-to-visible < 1s with healthy realtime.
- Zero message loss or duplication across reconnect cases.
- Known-message search success ≥ 95%.
- Healthy-provider Huddle creation ≥ 99%, p95 < 5s, usable URL.
- No unreconciled provider event older than 24h.
- Zero unauthorized metadata disclosure. Detail revocation immediate; search and AI within 60s.
- WCAG 2.2 AA on core flows. Pilot task completion without help ≥ 90%.

**Telemetry** (`message === "SPAN"`, p95 from `latencyMs`): `chat.message.send`, `chat.realtime.publish`, `chat.huddle.start`, `chat.search`, `chat.client.send_to_visible`, `chat.client.reconnect_gap`, `chat.client.duplicate_dropped`. DB snapshot: `pnpm chat:baseline`.

**What it should do**

1. Run observation windows (internal → pilots → staged) against the release gates with enough volume.
2. Keep support notes for removed controls current until the `/chat/channels` redirect deprecation window ends (90 days after GA).
3. Mark GA only when every release gate holds for a full staged window.
4. If a rollback trigger fires, revert frontend then backend; do not claim GA.

**Done when**

- [ ] Observation order has been executed with metric evidence (or explicitly waived with recorded volume rationale).
- [ ] Baseline values for every release-gate metric are recorded before any behaviour change.

- [ ] Backend: focused Jest, typecheck, lint, OpenAPI, migration, contract, tenant, idempotency and Ably gates pass.
- [ ] Frontend: focused Jest, type-check, lint, response-contract, permission, PageState, dead-code, file-size and route-bundle gates pass.

- [ ] Order: baseline telemetry, additive contracts and migration, internal cohort, agency/service pilots, staged release, GA.
- [ ] GA is marked only when every release gate holds for a full cohort/staged period.
