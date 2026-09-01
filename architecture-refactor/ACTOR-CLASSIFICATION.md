# Actor Classification — users.id FK Authority Map

> Produced by Lane 8, 2026-09-01. Supplements ACTOR-CONTRACTION-PLAN.md.
> **Gate state:** 617 total organizational FKs · 116 CRM/Inventory (out of scope) · 300 allowlisted display-only · **201 ACTIONABLE** (authority-bearing, must migrate to organization_members.id).
> Source of truth: `backend/src/scripts/actor-classification-allowlist.json` + `scan-legacy-org-actors.mjs`.

---

## 1. Corrections to ACTOR-CONTRACTION-PLAN.md

| Column | Plan said | Corrected to | Evidence |
|---|---|---|---|
| `journal_entries.created_by` | ATTR | **AUTH** | `accounting-ledger.service.ts:129` — `applyScope(scope, orgId, userId, { ownerColumn: journalEntries.createdBy })` |
| `enterprise_quotes.approver_id` | AUTH | **ATTR** | `enterprise-quotes.service.ts:77` — `leftJoin(users, eq(enterpriseQuotes.approverId, users.id))` — display join only, no auth predicate |
| `kb_spaces.created_by_id` | not classified | **AUTH** | `kb-spaces.service.ts:56` — `applyScope(scope, user.orgId, user.userId, { ownerColumn: kbSpaces.createdById })` |
| `okr_goals.created_by` | not classified | **AUTH** | `goals.service.ts:156` — `or(eq(okrGoals.ownerId, userId), eq(okrGoals.createdBy, userId))` |
| `support_macros.created_by` | ATTR | **AUTH** | `support-macros.service.ts:46` — `or(visibility != 'private', eq(supportMacros.createdBy, userId))` — visibility gate |
| `projects.client_id` | ATTR | **AUTH** | `client-portal.service.ts:26` — `eq(projects.clientId, userId)` — client portal access gate |
| `project_approvals.approver_id` | ATTR | **AUTH** | `approvals.service.ts:113` — `eq(projectApprovals.approverId, userId)` — active approval routing |

---

## 2. Classification Method

A column is **AUTH (authority-bearing)** if ANY of:
- It appears as `ownerColumn` in `applyScope(scope, orgId, userId, { ownerColumn: table.col })` — this is the DataScope filter that gates what a user with `own` scope can read
- It appears in a WHERE predicate as `eq(table.col, userId)` / `eq(table.col, actorUserId)` / `eq(table.col, actorMembershipId)` — it determines which rows the caller can see or act on
- It appears in a conditional that gates a mutation (`if (row.col !== actor.userId) throw 403`)

A column is **ATTR (historical-display-only)** only when ALL searches confirm:
- No `ownerColumn:` usage for it
- No WHERE filter reading it against the current actor's id
- Only display joins (`leftJoin(users, eq(table.col, users.id))`) or audit trail use

---

## 3. ACTIONABLE by Module — Ranked by Blast Radius

### 3.1 HR (107 ACTIONABLE) — highest blast radius

HR has the largest number of authority-bearing relationships because every employee's self-service (leave, attendance, expenses, performance, wellness) scopes by `user_id`.

**Owner patterns (DataScope `ownerColumn`):**
- `leave_requests.user_id` — `leaves-scope.ts:29` dual-scope (approver + employee both read as `userId`)
- `documents.user_id` — employee document DataScope ownerColumn
- `hr_wellness_checkins.user_id` — `hr-safety.service.ts:300` — `eq(hrWellnessCheckins.userId, userId)`
- `hr_attendance_regularizations.user_id` — `attendance-regularization.service.ts:61`
- `resignations.user_id` — `exit.service.ts:70`
- `hr_cases.assigned_to` + `hr_cases.reported_by` — `hr-cases.service.ts:57`, `service-delivery-inbox.service.ts:91`
- `hr_disciplinary_actions.employee_id` — `hr-disciplinary.service.ts:36`
- `hr_proxy_access.grantor_user_id`, `proxy_user_id` — proxy access control
- `recognitions.from_user_id`, `to_user_id` — `engagement.service.ts:223`
- `succession_plans.incumbent_id`, `successor_id`
- `employee_skills.user_id`
- `hr_accommodation_requests.user_id`
- And 90+ additional leave/attendance/performance ownership columns (see allowlist for ATTR sibling columns)

**Approver routing (still users.id):**
- `leave_requests.approver_id` — `leaves-scope.ts:29` — routes to approver's inbox (has expanded `approver_membership_id` sibling but `approver_id` still read in predicate)

**Migration priority:** Start with the DataScope `ownerColumn` columns (all access queries read them). Second priority: approver_id columns still in WHERE predicates. The raw-SQL `employee_career_plans.user_id` and `.mentor_id` require a hand-written migration because they are invisible to Drizzle.

### 3.2 Build (23 ACTIONABLE)

Authority columns verified in service files:

| Column | Evidence file | Line |
|---|---|---|
| `projects.manager_id` | `projects-budget.service.ts` | 54 |
| `projects.client_id` | `client-portal.service.ts` | 26 |
| `project_approvals.approver_id` | `approvals.service.ts` | 113 |
| `comment_drafts.user_id` | `comment-drafts.service.ts` | 45 |
| `okr_goals.owner_id` | `goals.service.ts` | 156 |
| `okr_goals.created_by` | `goals.service.ts` | 156 |
| `support_tickets.assignee_id` | `support-tickets.service.ts` | 108 |
| `ticket_comment_reactions.user_id` | `projects-ticket-comments.service.ts` | 276 |
| `tickets.assignee_id` | build tickets service |  |
| `ticket_assignees.user_id` | ticket assignment records |  |
| `ticket_watchers.user_id` | watcher scope |  |
| `project_members.user_id` | project membership |  |
| `meeting_attendees.user_id` | attendance gate |  |
| `project_whiteboard_shares.user_id` | whiteboard access gate |  |
| `feedbucket_submissions.assignee_id` | feedback routing |  |
| `project_team_members.user_id` | team membership |  |
| `project_workspace_members.user_id` | workspace access |  |
| `bugs.assignee_id` | bug assignment scope |  |
| `bugs.qa_owner_id` | QA ownership scope |  |
| `test_runs.tester_id` | test run ownership |  |
| `ticket_checklist_items.assignee_id` | checklist assignment |  |
| `meeting_standup_entries.user_id` | standup author gate |  |
| `change_requests.approval_owner_id` | change approval routing |  |
| `ticket_comment_mentions.mentioned_user_id` | mention delivery target |  |

### 3.3 Common (21 ACTIONABLE)

These are platform-infrastructure tables. Many are already half-migrated (have a `*_membership_id` sibling but the `user_id` column is still in predicate use):

- `notification_deliveries.user_id` — delivery target (the primary routing key)
- `notification_preferences.user_id` — preference lookup by actor
- `push_subscriptions.user_id` — push delivery routing
- `user_preferences.user_id` — preference owner
- `user_tour_progress.user_id` — progress tracking per actor
- `account_organization_index.user_id` — org-switcher index for the actor
- `agent_tokens.user_id` — API token ownership
- `user_integration_connections.user_id` — Composio connection ownership
- `onboarding_flow_sessions.user_id` — onboarding session owner
- `broadcast_read_receipts.user_id` — read receipt actor
- `coupon_redemptions.user_id` — redemption actor
- `notification_preference_rules.user_id` — preference rule owner
- `notification_consents.user_id` — consent actor
- `notification_digest_items.user_id` — digest delivery target
- `user_delegations.delegator_user_id`, `delegatee_user_id` — delegation principals
- `devices.user_id` — device ownership (deferred: needs platform design)
- `user_api_tokens.user_id` — API token ownership (deferred: global scope intentional)
- `onboarding_steps.user_id` — onboarding tracking (deferred: design question)
- `login_history.user_id` — login audit (permanent: authentication table semantics)

### 3.4 Payroll (17 ACTIONABLE)

All are employee ESS ownership columns — the employee's own data:

- `reimbursements.user_id`, `salary_loans.user_id`, `bonuses.user_id`, `fnf_settlements.user_id`
- `payroll_run_allocations.user_id`, `payroll_tds_ytd_ledger.user_id`, `hr_payroll_input_snapshots.user_id`
- `hr_payroll_adjustments.user_id`, `payroll_inputs.user_id`, `payroll_run_employees.user_id`
- `employee_salary_profiles.user_id`, `payslip_publications.user_id`
- `hr_comp_recommendations.user_id`
- `expenses.user_id`, `expenses.approver_id`
- Raw-SQL: `employee_career_plans.user_id`, `employee_career_plans.mentor_id`

### 3.5 Support (12 ACTIONABLE)

- `support_tickets.assignee_id` — `applyScope` ownerColumn; `support-tickets.service.ts:108`
- `support_agent_skills.user_id` — agent skill ownership
- `support_agent_availability.user_id` — availability ownership
- `support_macros.created_by` — visibility gate: `or(visibility != 'private', eq(...createdBy, userId))`
- `support_routing_rules.assignee_id` — routing target (not `created_by` which is ATTR)
- `support_ticket_drafts.user_id` — `support-drafts.service.ts:23`
- `support_saved_views.owner_id` — `support-workspace.service.ts:84`
- `support_ticket_watchers.user_id` — watcher gate
- `support_message_mentions.mentioned_user_id` — mention delivery target
- `kb_articles.owner_id` — `applyScope` ownerColumn in support KB
- `kb_space_members.user_id` — `kb-access.service.ts:84` — OR predicate: membership OR userId
- `kb_spaces.created_by_id` — `kb-spaces.service.ts:56` — `applyScope` ownerColumn

### 3.6 KB (10 ACTIONABLE)

- `kb_chat_conversations.user_id` — `kb-chat-history.service.ts:133`
- `kb_chat_messages.user_id` — chat message ownership
- `kb_page_reviews.reviewer_id` — active review responsibility
- `kb_pages.owner_user_id` — notification routing/ownership
- `kb_page_favorites.user_id` — personal favorites
- `kb_page_visits.user_id` — visit tracking per actor
- `kb_research_briefs.user_id` — research brief ownership
- `kb_article_restrictions.user_id` — article access restriction target
- `kb_spaces.created_by_id` — `applyScope` ownerColumn (also counted under Support/KB shared module)
- `kb_space_members.user_id` — dual-predicate access gate

### 3.7 AI (4 ACTIONABLE)

- `ai_chat_conversations.user_id` — `chat-history.service.ts:118`
- `ai_chat_messages.user_id` — `chat-history.service.ts:118`
- `ai_action_proposals.user_id` — proposal ownership
- `ai_jobs.user_id` — job ownership

### 3.8 Surveys (3 ACTIONABLE)

- `survey_participants.user_id` — participant scope
- `survey_forms.owner_user_id` — form ownership
- `survey_live_sessions.host_user_id` — host authority

### 3.9 Accounting (2 ACTIONABLE)

- `fin_approval_policies.approver_user_id` — `finance-posting.service.ts:253` routes approval based on this
- `journal_entries.created_by` — `accounting-ledger.service.ts:129` — `applyScope` ownerColumn

### 3.10 Billing (2 ACTIONABLE)

- `affiliates.user_id` — `affiliate.service.ts:19` — `eq(affiliates.userId, userId)`
- `ai_credit_reservations.user_id` — credit reservation ownership

---

## 4. Handoff — Ranked Migration Priority

| Priority | Module | Count | Key risk | Recommended first step |
|---|---|---|---|---|
| P1 | hr | 107 | DataScope gaps if ownership columns wrong: wrong employees see each other's leaves/docs | Migrate `leave_requests.user_id`, `documents.user_id` first — highest read volume |
| P2 | build | 23 | Cross-org client portal access (`projects.client_id`); comment draft leakage | Migrate `projects.manager_id`, `projects.client_id`, `project_approvals.approver_id` |
| P3 | common | 21 | Notification delivery failures if wrong actor; session/device authority | Migrate `notification_deliveries.user_id`, `user_preferences.user_id` |
| P4 | payroll | 17 | Employee self-service isolation (payslip, reimbursement, loan ownership) | Migrate `payroll_run_employees.user_id`, `reimbursements.user_id` |
| P5 | support | 12 | Ticket assignee scope leaks; private macro visibility | Migrate `support_tickets.assignee_id`, `support_macros.created_by` |
| P6 | kb | 10 | KB space ownership; article restriction targets | Migrate `kb_spaces.created_by_id`, `kb_article_restrictions.user_id` |
| P7 | ai | 4 | Chat history isolation | Migrate `ai_chat_conversations.user_id` |
| P8 | surveys | 3 | Survey participant scope | Migrate `survey_participants.user_id` |
| P9 | accounting | 2 | Ledger DataScope (journal visibility) | Migrate `journal_entries.created_by` |
| P10 | billing | 2 | Affiliate commission isolation | Migrate `affiliates.user_id` |

---

## 5. Gate State

```
node src/scripts/scan-legacy-org-actors.mjs
  617 total organizational
  116 CRM/Inventory (out of scope)
  300 allowlisted display-only
  201 ACTIONABLE (authority-bearing)
```

The `--check` gate now measures ACTIONABLE count, not the raw organizational count. To zero the gate:
1. Migrate an authority-bearing column (schema + service + migration) → ACTIONABLE drops by 1.
2. Confirm a column is display-only (trace all read sites, verify no auth predicate) → add to allowlist → ACTIONABLE drops by 1 without a migration.

The allowlist staleness validator runs at startup — a contracted column left in the allowlist is detected immediately on the next `--check` run.

---

## 6. Deferred Entries (not in ACTIONABLE, not fully contracted)

These are organizational FKs classified as AUTH but deferred because the correct design requires broader architectural decisions:

| Column | Reason |
|---|---|
| `devices.user_id` | Deferred: push device ownership requires a cross-module platform design decision |
| `user_api_tokens.user_id` | Deferred: API tokens may be intentionally global (not org-scoped) |
| `onboarding_steps.user_id` | Deferred: onboarding step tracking design is under review |
| `login_history.user_id` | Permanent: authentication audit table — must retain global users.id identity semantics |

These are currently counted in ACTIONABLE (common module, 21 entries). The lane owner should verify whether they belong in the allowlist or on the deferred list as the designs resolve.
