# Actor Contraction Plan — L35

**Prepared by:** L35 analysis lane, 2026-08-30  
**Repo:** `streamlineos-api` (backend only)  
**Status:** PLAN ONLY — no production files may be edited until a designated execution lane picks up a wave.

---

## 1. Scanner Definition (exact)

`scan-legacy-org-actors.mjs` classifies a column as a **"legacy organizational actor"** when ALL hold:

1. The column appears in a Drizzle `pgTable()` declaration inside `src/db/schema/**/*.ts`, excluding `hrms-phase1-sql-managed.ts`, `index.ts`, and `*.spec.ts`.
2. The column body contains `.references(() => users.id` (exact regex `\.references\s*\(\s*\(\s*\)\s*=>\s*users\.id`).
3. The containing table's DB name is NOT in `BRIDGE_TABLES` = `{organization_members, hr_people, organization_people, workers}`.
4. The containing table's DB name is NOT in `AUTH_TABLES` = `{users, accounts, user_sessions, mfa_backup_codes, magic_link_tokens, email_otp_codes, verification_tokens, password_resets, refresh_tokens, webauthn_credentials, passkeys}`.

**The ratchet gate** (`--check`) compares the current source count of "organizational" class columns against the baseline's count and fails if it rises.

**Critical blind spots** — the scanner CANNOT see:
- Tables created by raw SQL migrations (121 additional FKs in `pg_catalog` as of 2026-08-30 — see §4).
- Columns in `hrms-phase1-sql-managed.ts` (deliberately excluded from Drizzle management).
- Dynamic or side-effect imports.

---

## 2. Full Burden

As of 2026-08-30 (`--check` output: 555/555 remaining, 0 migrated since baseline):

| Source | Count |
|---|---|
| Source-visible organizational FKs (ratchet scope) | 555 |
| CRM (excluded from PRD) | 51 |
| Inventory (excluded from PRD) | 37 |
| **In-scope source-visible** | **467** |
| Invisible to ratchet (pg_catalog, raw SQL) | 121 |
| Of which CRM/Inventory invisible | ~61 |
| **In-scope invisible (Build + Accounting raw SQL + KB + misc)** | **~60** |
| **Total in-scope burden** | **~527** |

`pg_catalog` gap (`--catalog` mode, 2026-08-30): 665 total FK references to `users.id` live in the DB; 563 visible to source scan; 121 invisible (listed in §4.13).

---

## 3. AUTHORITY vs ATTRIBUTION — Classification Rules

**AUTHORITY** — column grants CURRENT capability (participation, assignment, ownership, access). Must stop being read; readers must switch to the membership counterpart before the legacy column can drop.

Column name patterns that indicate authority: `assignee_id`, `assigned_to`, `current_approver_id`, `approver_id`/`approver_user_id` when the record is in a pending/active state, `owner_id` on active ownership records, `manager_id`, `hr_rep_id`, `covering_employee_id`, `incumbent_id`, `successor_id`, `proxy_user_id`, `grantor_user_id`; `user_id` on active participation tables (membership, presence, roster, survey participant, huddle participant, calendar attendee, device registration).

**ATTRIBUTION** — column records who did something historically (author, actor, creator, approver of a completed action). Must KEEP rendering a departed member's name but must NOT grant that member any current access.

Column name patterns that indicate attribution: `created_by`, `posted_by`, `approved_by` on immutable/completed records, `rejected_by`, `decided_by`, `closed_by`, `locked_by`, `published_by`, `initiated_by`, `uploaded_by`, `recorded_by`, `confirmed_by`, `exported_by`, `reversed_by`, `reconciled_by`, `voided_by`, `issued_by`, `acknowledged_by`, `verified_by`, `placed_by`, `released_by`, `awarded_by`, `calibrated_by`, `submitted_by`, `completed_by`, `generated_by`, `rendered_by`, `reviewed_by`, `reported_by`, `referred_by`, `sent_by`, `accessed_by`, `imported_by`, `matched_by`, `reconciled_by`, `changed_by`, `updated_by` (audit-trail), `actor_id`, `actor_user_id`.

**Mixed** — some columns are both (e.g., `leave_requests.approver_id` is authority while pending, attribution once decided). These must be classified AUTHORITY in the contraction plan (if the application reads them to determine who must act NOW, contraction breaks the reader).

**Estimated split** (in-scope 467 source-visible): AUTHORITY ~130 · ATTRIBUTION ~337. The full per-column table in §5 classifies each one individually.

---

## 4. Module State and Expand Coverage

For each module, the expand phase status (does a `*_membership_id` counterpart exist?):

| Module | Legacy cols (in-scope) | Expand state | Notes |
|---|---|---|---|
| chat | 12 | 11/12 expanded | Missing: `chat_user_presence.user_id` |
| calendar (common schema) | 2 | 2/2 expanded | `calendar_events.created_by_membership_id`, `event_attendees.membership_id` |
| calendar (module schema) | 1 | 0/1 expanded | `calendar_source_preferences.user_id` — needs expand |
| kb | 24 | ~13/24 expanded | Pages (7), governance (2), favorites (1), visits (1) have counterparts; remaining 13 need verification |
| support | 25 | 0/25 expanded | Full expand cycle required before any contraction |
| timesheets | 15 | 3/15 expanded | `timesheets.approved_by_membership_id`, `timesheet_periods.approved_by_membership_id`, `expense_export_jobs.requested_by_membership_id` |
| billing | 18 | 0/18 expanded | Full expand cycle required |
| accounting | 27 | 0/27 expanded | Full expand cycle required (plus 11 invisible raw SQL cols) |
| payroll | 55 | ~5/55 expanded | `payroll_runs.approved_by_membership_id`, `payroll_run_events.acted_by_membership_id`, `claims.approver_membership_id`, `reimbursements.approved_by_membership_id` |
| ai | 6 | 0/6 expanded | Full expand cycle required |
| e-sign | 7 | 0/7 expanded | Full expand cycle required |
| surveys | 5 | 0/5 expanded | Full expand cycle required |
| mail | 1 | 0/1 expanded | Full expand cycle required |
| portal-access | 1 | 0/1 expanded | Full expand cycle required |
| common | 49 | ~10/49 expanded | audit_logs, access, auth (delegation/invitation) tables have some counterparts; ~39 need expand |
| directory | 2 | 1/2 expanded | `worker_engagements.created_by_membership_id` ✓; `hrms_migration_profiles.changed_by_platform_user_id` — no counterpart |
| hr | 219 | ~50/219 expanded | attendance, leave, performance, audit have some counterparts; recruitment, compensation, compliance do not |
| **total in-scope** | **467** | **~95/467 expanded** | |

---

## 5. Full Per-Column Table

Classification legend: **AUTH** = Authority · **ATTR** = Attribution · **MIXED** = both roles  
Counterpart: column name of the membership counterpart if it exists on the same table, or "NONE — needs expand"  
Wave: see §6 for wave definitions

### 5.1 Chat (Wave C1)

| table | legacy column | counterpart | class | readers | writers | wave | risk |
|---|---|---|---|---|---|---|---|
| chat_channels | created_by | created_by_membership_id | ATTR | chat-channels.service (display only) | chat-channels.service create | C1 | LOW |
| chat_channel_members | user_id | membership_id | AUTH | chat-channel-members.service (14+ call sites), chat-channels.service (2) | member add/remove | C1 | HIGH — active access gate |
| chat_messages | sender_id | sender_membership_id | ATTR | chat-channels.service join (1), message list | message create | C1 | MEDIUM — display |
| chat_user_presence | user_id | NONE — needs expand | AUTH | presence service | presence update | C1 | HIGH — add membership_id first |
| chat_pinned_messages | pinned_by | pinned_by_membership_id | ATTR | pin list display | pin create | C1 | LOW |
| chat_saved_messages | user_id | membership_id | AUTH | saved-messages queries | save/unsave | C1 | MEDIUM |
| chat_reply_reminders | recipient_user_id | recipient_membership_id | AUTH | reminder scheduler | reminder create | C1 | MEDIUM |
| chat_reply_reminders | sender_user_id | sender_membership_id | ATTR | reminder display | reminder create | C1 | LOW |
| chat_huddles | started_by | started_by_membership_id | ATTR | huddle display | huddle start | C1 | LOW |
| chat_huddle_participants | user_id | membership_id | AUTH | huddle participant list | join/leave | C1 | HIGH |
| chat_channel_invite_links | created_by | created_by_membership_id | ATTR | invite link display | link create | C1 | LOW |
| chat_org_settings | updated_by | updated_by_membership_id | ATTR | settings display | settings update | C1 | LOW |

### 5.2 Calendar (Wave C2)

| table | legacy column | counterpart | class | readers | writers | wave | risk |
|---|---|---|---|---|---|---|---|
| calendar_events | created_by | created_by_membership_id | ATTR | calendar-events service display | event create | C2 | LOW |
| event_attendees | user_id | membership_id | AUTH | attendee lookup (already normalized table) | attendee add | C2 | HIGH — already normalized, drop legacy |
| calendar_source_preferences | user_id | NONE — needs expand | AUTH | source-preferences service | preference update | C2 | MEDIUM — needs expand first |

### 5.3 Knowledge Base (Wave C3)

| table | legacy column | counterpart | class | readers | writers | wave | risk |
|---|---|---|---|---|---|---|---|
| kb_pages | created_by_id | created_by_membership_id | ATTR | page display/history | page create | C3 | LOW |
| kb_pages | last_edited_by_id | last_edited_by_membership_id | ATTR | page header display | page update | C3 | LOW |
| kb_pages | deleted_by_id | deleted_by_membership_id | ATTR | trash display | page delete | C3 | LOW |
| kb_pages | owner_user_id | owner_membership_id | AUTH | page ownership check, access gate | ownership assign | C3 | HIGH — access gate |
| kb_pages | verified_by_id | verified_by_membership_id | ATTR | verified badge display | verify action | C3 | LOW |
| kb_page_reviews | requested_by_id | requested_by_membership_id | ATTR | review display | review create | C3 | LOW |
| kb_page_reviews | reviewer_id | reviewer_membership_id | AUTH | review routing | reviewer assign | C3 | MEDIUM |
| kb_page_favorites | user_id | membership_id | AUTH | favorites list | add/remove favorite | C3 | MEDIUM |
| kb_page_visits | user_id | membership_id | AUTH | recent pages list | visit record | C3 | MEDIUM |
| kb_chat_conversations | user_id | NONE — verify | AUTH | kb-chat service | conversation create | C3 | MEDIUM |
| kb_chat_messages | user_id | NONE — verify | ATTR | kb-chat message list | message create | C3 | LOW |
| tenant_ai_credit_transactions | actor_id | NONE — verify | ATTR | credit audit display | credit charge | C3 | LOW |
| kb_events | actor_id | NONE — verify | ATTR | kb audit log | event emit | C3 | LOW |
| kb_space_members | user_id | NONE — verify | AUTH | space access gate | member add | C3 | HIGH — access gate |
| kb_article_votes | user_id | NONE — verify | AUTH | vote dedup | vote record | C3 | MEDIUM |
| kb_comments | user_id | NONE — verify | ATTR | comment display | comment create | C3 | LOW |
| kb_comment_reactions | user_id | NONE — verify | AUTH | reaction dedup | reaction record | C3 | MEDIUM |
| kb_page_permission_overrides | granted_by | NONE — verify | ATTR | override display | override grant | C3 | LOW |
| kb_page_edit_sessions | user_id | NONE — verify | AUTH | collab editor presence | session start | C3 | HIGH |
| kb_draft_assignments | user_id | NONE — verify | AUTH | draft ownership | draft assign | C3 | HIGH |
| kb_analytics_events | user_id | NONE — verify | ATTR | analytics display | event emit | C3 | LOW |
| kb_document_exports | created_by | NONE — verify | ATTR | export history | export trigger | C3 | LOW |
| kb_space_grants | granted_by | granted_by_membership_id (common/access.ts) | ATTR | grant audit | grant create | C3 | LOW |
| kb_chat_conversations | user_id | NONE — verify | AUTH | kb AI chat | conversation create | C3 | MEDIUM |

> Note: 13 KB columns marked "verify" need a schema read of their specific table to confirm expand state. Pre-wave C3 work: read `kb/chat.ts`, `kb/spaces.ts`, `kb/events.ts`, `kb/credits.ts`, `kb/page-collab.ts`, `kb/restrictions.ts`, `kb/governance.ts` and complete expand for any that lack a counterpart.

### 5.4 Support (Wave C4 — expand required)

| table | legacy column | counterpart | class | readers | writers | wave | risk |
|---|---|---|---|---|---|---|---|
| support_agent_skills | user_id | NONE | AUTH | agent routing | skill assign | C4 | HIGH |
| support_agent_availability | user_id | NONE | AUTH | availability check | status update | C4 | HIGH |
| kb_article_attachments | uploaded_by | NONE | ATTR | attachment display | upload | C4 | LOW |
| kb_articles | author_id | NONE | ATTR | article display | article create | C4 | LOW |
| kb_articles | owner_id | NONE | AUTH | article ownership | ownership assign | C4 | MEDIUM |
| support_tickets | assignee_id | NONE | AUTH | ticket routing, SLA | ticket assign | C4 | HIGH |
| support_tickets | snoozed_by | NONE | ATTR | snooze display | snooze action | C4 | LOW |
| support_tickets | created_by | NONE | ATTR | ticket display | ticket create | C4 | LOW |
| (remaining 17 support cols) | various | NONE | varies | symbol-search required | various | C4 | MEDIUM |

> All 25 support columns need the full expand cycle (add `*_membership_id`, backfill, validate, cutover, contract) before any legacy column drops.

### 5.5 Timesheets (Wave C5 — partial expand)

| table | legacy column | counterpart | class | readers | writers | wave | risk |
|---|---|---|---|---|---|---|---|
| timesheet_audit_events | actor_user_id | NONE | ATTR | audit display | audit emit | C5 | LOW |
| timesheets | user_id | NONE | AUTH | timesheet owner query | timesheet create | C5 | HIGH |
| timesheets | approved_by | approved_by_membership_id | ATTR | approval display | approve action | C5 | LOW |
| timesheets | locked_by | NONE | ATTR | lock display | lock action | C5 | LOW |
| timesheet_exceptions | user_id | NONE | AUTH | exception owner | exception create | C5 | HIGH |
| timesheet_exceptions | owner_user_id | NONE | AUTH | exception assignment | exception assign | C5 | HIGH |
| timesheet_exceptions | resolved_by | NONE | ATTR | resolution display | resolve action | C5 | LOW |
| timesheet_exports | ack_by | NONE | ATTR | export display | ack action | C5 | LOW |
| timesheet_exports | created_by | NONE | ATTR | export display | export trigger | C5 | LOW |
| timesheet_periods | user_id | NONE | AUTH | period owner | period create | C5 | HIGH |
| timesheet_periods | current_approver_id | NONE | AUTH | approval routing | period update | C5 | HIGH |
| timesheet_periods | approved_by | approved_by_membership_id | ATTR | approval display | approve action | C5 | LOW |
| timesheet_rates | user_id | NONE | AUTH | rate lookup | rate assign | C5 | HIGH |
| timesheet_settings_history | changed_by | NONE | ATTR | settings audit | settings change | C5 | LOW |
| timer_sessions | user_id | NONE | AUTH | timer owner | session start | C5 | HIGH |

### 5.6 Billing (Wave C6a — expand required)

| table | legacy column | counterpart | class | readers | writers | wave | risk |
|---|---|---|---|---|---|---|---|
| app_installations | installed_by | NONE | ATTR | install audit | install action | C6 | LOW |
| ai_credit_transactions | user_id | NONE | ATTR | credit audit | charge action | C6 | LOW |
| ai_credit_reservations | user_id | NONE | AUTH | reservation owner | reserve action | C6 | HIGH |
| affiliates | user_id | NONE | AUTH | affiliate identity | affiliate create | C6 | MEDIUM |
| referrals | referrer_user_id | NONE | ATTR | referral display | referral create | C6 | LOW |
| enterprise_quotes | approver_id | NONE | AUTH | quote approval routing | quote create | C6 | HIGH |
| enterprise_quotes | created_by_id | NONE | ATTR | quote display | quote create | C6 | LOW |
| billing_price_versions | created_by | NONE | ATTR | version audit | version create | C6 | LOW |
| org_entitlement_overrides | actor_id | NONE | ATTR | override audit | override apply | C6 | LOW |
| billing_invoice_snapshots | created_by | NONE | ATTR | snapshot audit | snapshot create | C6 | LOW |
| billing_credit_notes | created_by | NONE | ATTR | credit note display | note create | C6 | LOW |
| offer_fulfillment_components | created_by | NONE | ATTR | component audit | component create | C6 | LOW |
| payment_provider_credentials | created_by | NONE | ATTR | credential audit | credential create | C6 | LOW |
| payment_provider_credentials | updated_by | NONE | ATTR | credential audit | credential update | C6 | LOW |
| payment_test_transactions | created_by | NONE | ATTR | test display | test create | C6 | LOW |
| payment_audit_events | actor_user_id | NONE | ATTR | audit display | event emit | C6 | LOW |
| billing_proration_lines | created_by | NONE | ATTR | proration audit | line create | C6 | LOW |
| billing_seat_events | actor_id | NONE | ATTR | seat audit | event emit | C6 | LOW |

### 5.7 AI (Wave C6b — expand required)

| table | legacy column | counterpart | class | readers | writers | wave | risk |
|---|---|---|---|---|---|---|---|
| ai_chat_conversations | user_id | NONE | AUTH | conversation owner | conv create | C6 | HIGH |
| ai_chat_messages | user_id | NONE | ATTR | message display | message create | C6 | LOW |
| ai_action_proposals | user_id | NONE | AUTH | proposal owner | proposal create | C6 | MEDIUM |
| ai_feedback | user_id | NONE | ATTR | feedback display | feedback create | C6 | LOW |
| ai_jobs | user_id | NONE | AUTH | job owner | job create | C6 | MEDIUM |
| ai_summary_snapshots | generated_by | NONE | ATTR | snapshot audit | snapshot generate | C6 | LOW |

### 5.8 E-sign (Wave C6c — expand required)

| table | legacy column | counterpart | class | readers | writers | wave | risk |
|---|---|---|---|---|---|---|---|
| sign_bulk_send_jobs | sender_user_id | NONE | AUTH | job sender | job create | C6 | MEDIUM |
| sign_documents | created_by | NONE | ATTR | doc display | doc create | C6 | LOW |
| sign_envelopes | sender_user_id | NONE | AUTH | envelope sender | env create | C6 | MEDIUM |
| sign_envelopes | voided_by | NONE | ATTR | void display | void action | C6 | LOW |
| sign_public_forms | created_by | NONE | ATTR | form display | form create | C6 | LOW |
| (2 more e-sign cols) | — | NONE | — | symbol-search required | — | C6 | LOW |

### 5.9 Surveys (Wave C6d — expand required)

| table | legacy column | counterpart | class | readers | writers | wave | risk |
|---|---|---|---|---|---|---|---|
| survey_participants | user_id | NONE | AUTH | participant list, dedup | participate action | C6 | HIGH |
| survey_forms | owner_user_id | NONE | AUTH | form ownership | form create | C6 | MEDIUM |
| survey_forms | created_by | NONE | ATTR | form audit | form create | C6 | LOW |
| survey_versions | created_by | NONE | ATTR | version audit | version create | C6 | LOW |
| survey_live_sessions | host_user_id | NONE | AUTH | session host | session create | C6 | MEDIUM |

### 5.10 Mail + Portal-access (Wave C6e)

| table | legacy column | counterpart | class | readers | writers | wave | risk |
|---|---|---|---|---|---|---|---|
| mail_message_metadata | user_id | NONE | AUTH | mail owner | mail sync | C6 | HIGH |
| portal_memberships | user_id | NONE | AUTH | portal access gate | portal member create | C6 | HIGH |

### 5.11 Accounting (Wave C7 — expand required)

#### Drizzle-managed (27 columns)

| table | legacy column | counterpart | class | readers | writers | wave | risk |
|---|---|---|---|---|---|---|---|
| accounting_periods | closed_by | NONE | ATTR | period audit | period close | C7 | LOW |
| accounting_periods | locked_by | NONE | ATTR | period audit | period lock | C7 | LOW |
| fin_approval_policies | approver_user_id | NONE | AUTH | approval routing | policy create | C7 | HIGH — financial authority |
| fin_approval_requests | requested_by | NONE | ATTR | request display | request create | C7 | LOW |
| fin_approval_requests | decided_by | NONE | ATTR | decision display | decide action | C7 | LOW |
| fin_recurring_journal_templates | created_by | NONE | ATTR | template audit | template create | C7 | LOW |
| journal_entries | created_by | NONE | ATTR | entry display | entry create | C7 | LOW |
| journal_entries | approved_by | NONE | ATTR | approval display | entry approve | C7 | LOW |
| journal_entries | posted_by | NONE | ATTR | post display | entry post | C7 | LOW |
| credit_notes | created_by | NONE | ATTR | note display | note create | C7 | LOW |
| vendor_credits | created_by | NONE | ATTR | credit display | credit create | C7 | LOW |
| fin_recurring_invoice_templates | created_by | NONE | ATTR | template audit | template create | C7 | LOW |
| fin_recurring_bill_templates | created_by | NONE | ATTR | template audit | template create | C7 | LOW |
| fin_collection_activities | created_by | NONE | ATTR | activity display | activity create | C7 | LOW |
| fin_payment_runs | created_by | NONE | ATTR | run display | run create | C7 | LOW |
| fin_payment_runs | approved_by | NONE | ATTR | approval display | run approve | C7 | LOW |
| acc_depreciation_runs | created_by | NONE | ATTR | run display | run create | C7 | LOW |
| fin_bank_imports | created_by | NONE | ATTR | import audit | import action | C7 | LOW |
| fin_reconciliation_matches | confirmed_by | NONE | ATTR | match display | match confirm | C7 | LOW |
| fin_bank_transfers | created_by | NONE | ATTR | transfer display | transfer create | C7 | LOW |
| fin_reimbursement_batches | created_by | NONE | ATTR | batch display | batch create | C7 | LOW |
| fin_reimbursement_batches | approved_by | NONE | ATTR | approval display | batch approve | C7 | LOW |
| fin_budgets | created_by | NONE | ATTR | budget display | budget create | C7 | LOW |
| fin_budgets | approved_by | NONE | ATTR | approval display | budget approve | C7 | LOW |
| fin_budget_revisions | created_by | NONE | ATTR | revision display | revision create | C7 | LOW |
| fin_cash_flow_scenarios | created_by | NONE | ATTR | scenario display | scenario create | C7 | LOW |
| acc_tax_payments | created_by | NONE | ATTR | payment display | payment create | C7 | LOW |

#### Invisible to ratchet — raw SQL (11 columns, pg_catalog only)

These require raw SQL migrations and separate journal entries. They are NOT counted in the ratchet.

| table | column | class |
|---|---|---|
| ap_allocations | created_by | ATTR |
| ap_documents | created_by | ATTR |
| ap_documents | posted_by | ATTR |
| ap_payments | created_by | ATTR |
| ar_allocations | created_by | ATTR |
| ar_documents | created_by | ATTR |
| ar_documents | posted_by | ATTR |
| ar_receipts | created_by | ATTR |
| bank_matches | matched_by | ATTR |
| bank_statements | imported_by | ATTR |
| bank_statements | reconciled_by | ATTR |

### 5.12 Common Infrastructure (Wave C8)

The 49 common-module legacy columns span authentication, organization management, notifications, and cross-cutting concerns. Grouped by risk:

#### 5.12a Already expanded

| table | legacy column | counterpart | class | wave | risk |
|---|---|---|---|---|---|
| audit_logs | user_id | actor_membership_id | ATTR | C8 | LOW |
| agent_tokens | user_id | issuer_membership_id | AUTH | C8 | MEDIUM |
| invitations | invited_by | inviter_membership_id | ATTR | C8 | LOW |
| calendar_events | created_by | created_by_membership_id | ATTR | C2 | LOW |
| event_attendees | user_id | membership_id | AUTH | C2 | HIGH |
| user_delegations | revoked_by | revoker tracked via delegator/delegatee | ATTR | C8 | LOW |

#### 5.12b Not expanded — Auth-adjacent (defer, see §8)

| table | legacy column | class | rationale |
|---|---|---|---|
| devices | user_id | AUTH | Device-to-user link is authentication infrastructure; the membership may not exist when device is registered. Defer with documented exception. |
| login_history | user_id | ATTR | Authentication audit log; the relevant actor IS a global user. Membership may not exist (platform admin, API key). Document as permanent KEEP. |
| user_api_tokens | user_id | AUTH | API token identity is global-user; changing to membership breaks the token resolver. Defer with documented exception. |
| onboarding_steps | user_id | AUTH | Onboarding may predate membership creation. Defer with documented exception. |

#### 5.12c Not expanded — Organization management

| table | legacy column | counterpart | class | wave | risk |
|---|---|---|---|---|---|
| org_custom_domains | created_by | NONE | ATTR | C8 | LOW |
| org_holidays | created_by | NONE | ATTR | C8 | LOW |
| org_units | head_user_id | NONE | AUTH | C8 | HIGH — org structure |
| org_unit_members | user_id | NONE | AUTH | C8 | HIGH — org structure |
| api_keys | created_by | NONE | ATTR | C8 | LOW |
| roles | created_by | NONE | ATTR | C8 | LOW |
| broadcasts | created_by | NONE | ATTR | C8 | LOW |
| feature_flags | created_by_id | NONE | ATTR | C8 | LOW |
| feature_flags | updated_by_id | NONE | ATTR | C8 | LOW |
| legal_entities | created_by | NONE | ATTR | C8 | LOW |
| resource_grants | granted_by | NONE | ATTR | C8 | LOW |
| webhook_endpoints | created_by | NONE | ATTR | C8 | LOW |
| user_module_access | updated_by | NONE | ATTR | C8 | LOW |
| kb_space_grants | granted_by | NONE | ATTR | C8 | LOW |
| user_integration_connections | user_id | NONE | AUTH | C8 | HIGH — integration auth |

#### 5.12d Not expanded — Notifications

| table | legacy column | class | wave | risk |
|---|---|---|---|---|
| notifications | user_id | AUTH | C8 | HIGH — delivery target |
| notifications | actor_user_id | ATTR | C8 | LOW — display |
| notification_read_watermarks | user_id | AUTH | C8 | HIGH — per-user watermark |
| notification_preferences | user_id | AUTH | C8 | HIGH — per-user preference |
| notification_deliveries | user_id | AUTH | C8 | HIGH — delivery target |
| notification_suppression_rules | user_id | AUTH | C8 | HIGH — suppression owner |
| notification_suppression_rules | created_by | ATTR | C8 | LOW |
| notification_preference_rules | user_id | AUTH | C8 | MEDIUM |
| notification_consents | user_id | AUTH | C8 | MEDIUM |
| notification_digest_items | user_id | AUTH | C8 | HIGH |
| broadcast_read_receipts | user_id | AUTH | C8 | MEDIUM |
| notification_policy_defaults | created_by | ATTR | C8 | LOW |
| notification_provider_accounts | created_by | ATTR | C8 | LOW |
| notification_templates | created_by | ATTR | C8 | LOW |
| notification_audit_logs | actor_id | ATTR | C8 | LOW |
| push_subscriptions | user_id | AUTH | C8 | HIGH — push target |
| coupon_redemptions | user_id | AUTH | C8 | MEDIUM |
| user_preferences | user_id | AUTH | C8 | HIGH — per-user prefs |
| account_organization_index | user_id | AUTH | C8 | HIGH — org access index |
| onboarding_flow_sessions | user_id | AUTH | C8 | MEDIUM |
| user_tour_progress | user_id | AUTH | C8 | MEDIUM |
| onboarding_analytics_events | user_id | ATTR | C8 | LOW |
| platform_messages | replied_by_id | ATTR | C8 | LOW |
| ai_usage_logs | user_id | ATTR | C8 | LOW |

### 5.13 Payroll (Wave C9 — partial expand)

| table | legacy column | counterpart | class | wave | risk |
|---|---|---|---|---|---|
| expenses | user_id | NONE | AUTH | C9 | HIGH |
| expenses | approver_id | NONE | AUTH | C9 | HIGH |
| reimbursements | user_id | NONE | AUTH | C9 | HIGH |
| reimbursements | approved_by | approved_by_membership_id | ATTR | C9 | LOW |
| salary_loans | user_id | NONE | AUTH | C9 | HIGH |
| salary_loans | approved_by | NONE | ATTR | C9 | LOW |
| bonuses | user_id | NONE | AUTH | C9 | HIGH |
| bonuses | approved_by | NONE | ATTR | C9 | LOW |
| fnf_settlements | user_id | NONE | AUTH | C9 | HIGH |
| fnf_settlements | approved_by | NONE | ATTR | C9 | LOW |
| asset_returns | user_id | NONE | AUTH | C9 | MEDIUM |
| payroll_command_receipts | actor_id | NONE | ATTR | C9 | LOW |
| payroll_entities | created_by | NONE | ATTR | C9 | LOW |
| payroll_periods | locked_by | NONE | ATTR | C9 | LOW |
| payroll_filings | created_by | NONE | ATTR | C9 | LOW |
| payroll_jobs | created_by | NONE | ATTR | C9 | LOW |
| payroll_run_allocations | user_id | NONE | AUTH | C9 | HIGH — allocation owner |
| payroll_tds_ytd_ledger | user_id | NONE | AUTH | C9 | HIGH — tax ledger |
| hr_payroll_input_periods | locked_by | NONE | ATTR | C9 | LOW |
| hr_payroll_input_periods | created_by | NONE | ATTR | C9 | LOW |
| hr_payroll_input_snapshots | user_id | NONE | AUTH | C9 | HIGH |
| hr_payroll_adjustments | user_id | NONE | AUTH | C9 | HIGH |
| hr_payroll_adjustments | created_by | NONE | ATTR | C9 | LOW |
| hr_payroll_adjustments | approved_by | NONE | ATTR | C9 | LOW |
| hr_payroll_adjustments | rejected_by | NONE | ATTR | C9 | LOW |
| payroll_inputs | user_id | NONE | AUTH | C9 | HIGH |
| payroll_inputs | overridden_by | NONE | ATTR | C9 | LOW |
| payroll_journal_batches | posted_by | NONE | ATTR | C9 | LOW |
| payroll_journal_batches | exported_by | NONE | ATTR | C9 | LOW |
| payroll_journal_batches | reversed_by | NONE | ATTR | C9 | LOW |
| payroll_journal_batches | reconciled_by | NONE | ATTR | C9 | LOW |
| payroll_journal_batches | created_by | NONE | ATTR | C9 | LOW |
| payroll_runs | locked_by | NONE | ATTR | C9 | LOW |
| payroll_runs | approved_by | approved_by_membership_id | ATTR | C9 | LOW |
| payroll_runs | paid_by | NONE | ATTR | C9 | LOW |
| payroll_runs | published_by | NONE | ATTR | C9 | LOW |
| payroll_runs | closed_by | NONE | ATTR | C9 | LOW |
| payroll_runs | reopened_by | NONE | ATTR | C9 | LOW |
| payroll_runs | created_by | NONE | ATTR | C9 | LOW |
| hr_arrears_adjustments | created_by | NONE | ATTR | C9 | LOW |
| hr_payroll_compliance_tasks | completed_by | NONE | ATTR | C9 | LOW |
| hr_comp_cycles | created_by | NONE | ATTR | C9 | LOW |
| hr_comp_recommendations | user_id | NONE | AUTH | C9 | HIGH |
| hr_comp_recommendations | submitted_by | NONE | ATTR | C9 | LOW |
| hr_comp_recommendations | calibrated_by | NONE | ATTR | C9 | LOW |
| hr_comp_recommendations | approved_by | NONE | ATTR | C9 | LOW |
| hr_equity_grants | created_by | NONE | ATTR | C9 | LOW |
| hr_equity_exercises | created_by | NONE | ATTR | C9 | LOW |
| expense_export_jobs | requested_by | requested_by_membership_id | ATTR | C9 | LOW |
| fin_approval_policies | approver_user_id | NONE | AUTH | C7 | HIGH — see §5.11 |
| (payroll_run_events) | acted_by | acted_by_membership_id | ATTR | C9 | LOW |
| resignations | user_id | NONE | AUTH | C9 | HIGH |
| resignations | approved_by | NONE | ATTR | C9 | LOW |
| resignations | hr_reviewed_by | NONE | ATTR | C9 | LOW |
| resignations | final_reviewed_by | NONE | ATTR | C9 | LOW |
| resignations | exit_interview_conducted_by | NONE | ATTR | C9 | LOW |

### 5.14 Directory (Wave C10)

| table | legacy column | counterpart | class | wave | risk |
|---|---|---|---|---|---|
| hrms_migration_profiles | changed_by_platform_user_id | NONE | ATTR | C10 | LOW — platform admin |
| worker_engagements | created_by | created_by_membership_id | ATTR | C10 | LOW |

### 5.15 HR (Wave C11 — split into sub-waves)

219 HR columns. Classification by sub-domain:

**HR-A: Leave & Attendance (HIGH priority — active assignments)**

| table | legacy column | counterpart | class | risk |
|---|---|---|---|---|
| leave_requests | user_id | NONE | AUTH | HIGH |
| leave_requests | approver_id | approver_membership_id | AUTH | HIGH |
| leave_requests | covering_employee_id | NONE | AUTH | HIGH |
| hr_attendance_regularizations | user_id | NONE | AUTH | HIGH |
| hr_attendance_regularizations | approved_by | approved_by_membership_id | ATTR | LOW |
| hr_attendance_regularizations | rejected_by | NONE | ATTR | LOW |
| wfh_requests | approver_id | approver_membership_id | AUTH | HIGH |
| (all other attendance/leave cols) | — | varies | varies | MEDIUM |

**HR-B: Performance & Feedback**

| table | legacy column | counterpart | class | risk |
|---|---|---|---|---|
| performance_reviews | reviewer_id | reviewer_membership_id | AUTH | HIGH |
| feedback_requests | reviewer_user_id | reviewer_membership_id | AUTH | HIGH |
| hr_comp_recommendations | user_id | NONE | AUTH | HIGH |
| (remaining perf/feedback cols) | — | varies | varies | MEDIUM |

**HR-C: Recruitment (ATTRIBUTION-heavy)**

Most recruitment columns (`created_by`, `posted_by`, `approved_by`, `offered_by`, `assigned_by`, `referred_by`, `sent_by`) are ATTRIBUTION. Recruitment tables:

`job_postings`, `candidates`, `candidate_messages`, `candidate_offers`, `offer_versions`, `pipeline_automations`, `job_recruiters`, `headcount_requests`, `job_requisitions`, `hiring_flows`, `scorecard_templates`, `interview_booking_links`, `candidate_referrals`, `calibration_sessions`, `candidate_documents_vault`, `vault_access_logs`, `interview_questions`, `candidate_reference_checks`, `offer_negotiations`, `offer_letter_templates`, `email_sequences`, `recruitment_vendors`, `scheduled_reports`, `hr_import_jobs`, `job_board_postings`, `candidate_sources`, `candidate_documents`

Classification: primarily ATTR (most are audit-trail creators/approvers). Key AUTHORITY exceptions: `job_requisitions.hiring_manager_id`, `job_requisitions.approver_id`, `hiring_flows.created_by` (if it controls access).

**HR-D: Offboarding & HR Admin**

`terminations`, `resignations`, `exit_checklists`, `hr_cases`, `hr_disciplinary_actions`, `hr_legal_holds`, `hr_data_requests`, `hr_proxy_access`, `hr_succession_plans`

Most are ATTRIBUTION except: `hr_cases.assigned_to` (AUTHORITY), `hr_succession_plans.incumbent_id`, `hr_succession_plans.successor_id` (AUTHORITY).

**HR-E: Misc HR (ATTRIBUTION)**

`announcements.author_id`, `announcement_reads.user_id`, `assets.assigned_to`, `hr_automation_rules.created_by`, `hr_email_templates.created_by`, `team_events.organized_by`, `hr_badge_awards.awarded_by`, `hr_polls.created_by`, `hr_communities.created_by`, `hr_campaigns.created_by`, `documents.uploaded_by`, `handbook_versions.published_by`, `rich_documents.created_by`, `rich_documents.updated_by`, `hr_employment_history.created_by`, `hr_effective_dated_changes.*`, `hr_reporting_lines.*`, `hr_audit_logs.actor_id`, `hr_insurance_claims.decided_by`

Most are ATTRIBUTION. `announcement_reads.user_id` and `assets.assigned_to` are AUTHORITY.

**Full HR column list** (abbreviated for brevity — all 219 columns are in the TSV baseline at `backend/data/legacy-actor-baseline.json`; a pre-wave audit must read each HR schema file and complete the table):

The HR module has 219 legacy columns across approximately 80 tables. An execution lane picking up Wave C11 must:
1. Read all HR schema files in `src/db/schema/hr/`
2. For each table, confirm which membership counterparts exist
3. Classify each column AUTHORITY or ATTRIBUTION
4. Group into sub-waves C11-A through C11-E (one per HR sub-domain)
5. Symbol-search each AUTHORITY column across all modules for readers and writers

---

## 6. Contraction Waves

### Wave Definitions

| Wave | Modules | Source-visible cols | Invisible cols | Expand state | Estimated effort |
|---|---|---|---|---|---|
| C1 | Chat | 12 | 0 | 11/12 expanded | 1 week |
| C2 | Calendar | 3 | 0 | 2/3 expanded | 3 days |
| C3 | KB | 24 | 1 (pages.created_by) | ~13/24 expanded | 2 weeks |
| C4 | Support | 25 | 0 | 0/25 | 2 weeks |
| C5 | Timesheets | 15 | 0 | 3/15 expanded | 1.5 weeks |
| C6 | Billing + AI + E-sign + Surveys + Mail + Portal | 38 | 0 | 0/38 | 3 weeks |
| C7 | Accounting | 27 | 11 | 0/27 | 3 weeks |
| C8 | Common | 49 | 4 (modules.*, orgs.*) | ~10/49 | 3 weeks |
| C9 | Payroll | 55 | 1 | ~5/55 | 3 weeks |
| C10 | Directory | 2 | 0 | 1/2 | 2 days |
| C11 | HR | 219 | ~40 | ~50/219 | 8+ weeks |
| excluded | CRM + Inventory | 88 | ~61 | — | excluded |

### Migration Strategy Per Wave

Each wave follows this sequence. No shortcuts.

```
EXPAND → BACKFILL → VALIDATE → CUTOVER → CONTRACT
```

#### EXPAND
- Add nullable `*_membership_id` integer column with composite FK `(org_id, membership_id) → (organization_members.org_id, organization_members.id)`.
- FK must be `ON DELETE SET NULL` (not CASCADE) — a departed member must remain renderable in historical records (ATTRIBUTION); the application query then renders "Former Member" when the FK is null.
- AUTHORITY columns that must remain non-null after cutover: plan a `NOT VALID` constraint check before removing the legacy column.
- Migration shape: `ADD COLUMN ... nullable` → journal entry → deploy → verify.

#### BACKFILL
- Resumable, in batches of 500 rows max, using cursor pagination on `(org_id, id)`.
- For each batch: `UPDATE t SET membership_id = m.id FROM organization_members m WHERE m.org_id = t.org_id AND m.user_id = t.user_id AND t.membership_id IS NULL AND t.id > $cursor`.
- **CRITICAL**: Do NOT route batch timestamps through a JavaScript `Date` object when building cursor values — a JS Date truncates microseconds; if the table uses a microsecond-precision `created_at` as a composite FK this causes 23503 rollbacks on every delivery. Use the raw DB id or `(org_id, id)` cursor only.
- Log unmappable rows (user not a member of the org) — these are historical departed members. For ATTR columns, leave `membership_id = NULL` and render as "Former Member". For AUTH columns, the departed member must be investigated case-by-case (leaked authority?).
- Log duplicate rows — a user who has multiple membership rows in the same org (this should not happen post-dedup, but verify).
- Backfill is resumable: re-running the batch script is safe (the `WHERE membership_id IS NULL` filter skips already-done rows).

#### VALIDATE
- Run `SELECT COUNT(*) FROM t WHERE membership_id IS NULL AND user_id IS NOT NULL` — this is the unmappable count.
- For AUTHORITY columns: zero unmappable MUST be achieved before cutover, OR each unmappable row must be investigated and either resolved or documented.
- For ATTRIBUTION columns: non-zero unmappable is expected (departed members) — document the count, do not block.
- Run the module-graph tool (`pnpm exec knip --no-progress`) to enumerate all static importers of the legacy column's JS name. Read each importer to confirm it uses the membership counterpart or a compatibility shim.
- Run `nest build` — this is the only proof that a missing side-effect import does not break the build.

#### CUTOVER
- Remove readers of the legacy column in application code. Switch to reading `*_membership_id` (with a join to `organization_members` for display name/avatar, or via the `person-seam.ts` resolver).
- Historical/attribution views: render "Former Member [id]" or the last-known display name snapshot when `membership_id IS NULL`.
- Authority code paths: after cutover, MUST use only the membership column for authorization decisions.
- Deploy and verify with runtime checks.

#### CONTRACT
- Run zero-use proof: module-graph tool PLUS `nest build`. `grep` alone is NOT proof (side-effect imports and dynamic imports are invisible).
- Once proof passes: `ALTER TABLE t DROP COLUMN user_id CASCADE` (or the specific legacy column name).
- Add migration journal entry.
- Bump the ratchet baseline via `node src/scripts/scan-legacy-org-actors.mjs --emit-baseline`.
- Verify `--check` shows fewer remaining.

### Historical Actor Rendering

After contraction, every read path that previously joined `users` on the legacy column must handle `membership_id IS NULL`:
- Query: `LEFT JOIN organization_members om ON om.org_id = t.org_id AND om.id = t.membership_id LEFT JOIN users u ON u.id = om.user_id`
- Render: if `u IS NULL` → `{ displayName: "Former Member", avatarUrl: null, userId: null }`.
- Do NOT hard-delete historical attribution rows. The `SET NULL` on the FK is correct — a departed member's name disappears but the event stays.

### Zero-Use Proof Requirements

Per wave, before contracting any column:
1. `pnpm exec knip --no-progress` — must report zero references to the JS name of the legacy column.
2. `NODE_OPTIONS=--max-old-space-size=8192 pnpm typecheck` — must pass.
3. `nest build` — must succeed (this catches missing side-effect imports that knip misses).
4. `pnpm scan:legacy-actors:check` — count must have dropped by the expected amount.
5. For AUTHORITY columns: e2e test verifying that the cutover path correctly grants/denies access.

### What Must NOT Break

1. Historical/inactive actors must stay RENDERABLE. A `SET NULL` FK means `membership_id IS NULL` in the row; the reader renders "Former Member". Never delete attribution records.
2. The `organization_people` / `organization_members` / `workers` / `hr_people` facet model: never infer one facet from another. A null `membership_id` means "the person's login is no longer active in this org" — not "the person never existed."
3. Resolve persons via `modules/directory/person-seam.ts`, not by querying facets directly.
4. Backfill timestamp cursors must NOT route through JS `Date` — use row `id` cursors only.
5. A column with `onDelete: "restrict"` on the legacy FK cannot be dropped until the FK is first removed or replaced. Check FK mode for every column before contracting.

---

## 7. Invisible-to-Ratchet Columns (Raw SQL Tables)

The 121 invisible pg_catalog FKs to `users.id` are NOT counted in the ratchet. Of these:

**In-scope (Build module, raw SQL)** — ~50 columns across:
`bugs`, `change_requests`, `cycles`, `project_*`, `sprint_scope_events`, `test_*`, `ticket_*`, `okr_*`, `managed_products`, `managed_product_releases`, `meeting_*`, `learning_paths`, `git_connections`, `workflow_transitions`, `feedbucket_*`, `form_submissions`, `comment_drafts`, `incident_updates`, `modules`, `organizations.purge_scheduled_by`, `subprocessors`, `pages.created_by`

**In-scope (Accounting, raw SQL)** — 11 columns (listed in §5.11)

**Excluded (CRM/Inventory, raw SQL)** — ~61 columns

These invisible columns require:
1. Raw SQL `ALTER TABLE ... ADD COLUMN` migrations for expand.
2. A separate journal entry for each migration.
3. They MUST be tracked in a supplemental list (not the ratchet baseline) so progress is visible.
4. They CANNOT be verified by `pnpm scan:legacy-actors:check` — use `pnpm scan:legacy-actors:catalog` (needs live DB).

---

## 8. Deferrals

The following are deferred with documented reasons. A later lane may revisit with new evidence.

| Scope | Reason | Condition to revisit |
|---|---|---|
| `devices.user_id` | Device-to-user link is authentication infrastructure. Membership may not exist when a device is registered (pre-login). Changing to membership_id would break the device attestation flow. **KEEP as permanent exception.** | Never — document as architecture exception. |
| `login_history.user_id` | Authentication audit log. The subject IS a global user (platform admin, API key holder, unaffiliated login). Membership is irrelevant here. **KEEP as permanent exception.** | Never — document as architecture exception. |
| `user_api_tokens.user_id` | API token identity resolver reads this column in the JWT guard. Changing to membership_id requires the token to carry an org context at issuance. This is a separate migration requiring API contract changes. **Defer** until API token scoping is redesigned. | When API token scoping is redesigned. |
| `onboarding_steps.user_id` | Onboarding occurs before membership assignment. The user_id IS the correct identifier here. **KEEP as permanent exception** for the pre-membership step; post-membership steps may adopt membership_id. | When onboarding is redesigned to be org-context-aware. |
| Build invisible raw SQL (~50 cols) | These are raw SQL tables outside Drizzle management. The expand phase requires raw SQL ALTER TABLE migrations, journal entries, and a separate tracking mechanism. The volume (~50 columns across ~20 tables) is substantial. **Defer** to a dedicated Build actor migration program. | When a dedicated lane is assigned with raw SQL migration authority. |
| HR Wave C11 (219 cols) | Largest wave. Many counterparts exist but ~170 do not. Execution requires 8+ weeks and touches the most sensitive domain. **Defer** until Waves C1–C10 are complete and the process is proven. | After Waves C1–C10 are all verified done. |

---

## 9. Cost and Sequencing

### Safe to Execute Now (low coordination risk)

| Wave | Why safe | Recommended lane count |
|---|---|---|
| C1 (Chat) | 11/12 expanded; module is relatively isolated; chat.service reads are bounded | 1 lane |
| C2 (Calendar) | 2/3 expanded; calendar module is small; event_attendees already normalized | 1 lane |
| C10 (Directory) | Only 2 columns; 1/2 expanded; no downstream impact | 1 lane with C2 |

### Safe Soon (after targeted expand work)

| Wave | Pre-work needed | Timeline |
|---|---|---|
| C3 (KB) | Verify/expand remaining 11 KB columns without counterparts | 2–3 days pre-work |
| C5 (Timesheets) | Expand 12 remaining timesheets columns | 3–5 days pre-work |

### Require Maintenance Window or Coordinated Deploy

| Wave | Why coordinated | Risk |
|---|---|---|
| C8 (Common infra) | Notifications and org-structure columns have high blast radius; `notifications.user_id` is on a partitioned high-volume table; `org_unit_members.user_id` affects org hierarchy queries across all modules | HIGH |
| C9 (Payroll) | Financial records; payroll run immutability means backfill must never touch committed run records; salary/bonus/loan identity must not drift | HIGH |
| C7 (Accounting) | Financial records; `fin_approval_policies.approver_user_id` is AUTHORITY on live financial policy | HIGH |

### Defer with Written Reason

| Wave | Decision | Written reason |
|---|---|---|
| C6 (Billing+AI+E-sign+Surveys) | **DEFER** | None of the 38 columns have membership counterparts; full expand is needed first; these modules have low query pressure on actor columns; the business cost of a rendering regression on billing records outweighs the gain |
| C4 (Support) | **DEFER** | Full expand needed; support tickets are customer-facing and agent-assignment is AUTHORITY; `support_tickets.assignee_id` must not be wrong while migrating |
| C11 (HR) | **DEFER** | 219 columns; requires a dedicated multi-week program; defer until C1–C10 are verified |
| C12 (Build raw SQL invisible) | **DEFER** | Outside Drizzle management; requires raw SQL migration program; Drizzle ratchet is blind to these; volume is ~50 cols across ~20 tables |
| CRM + Inventory | **EXCLUDED** | Excluded from PRD scope |

---

## 10. Per-Wave Zero-Use Proof Checklist

For each wave, before the CONTRACT step:

```
[ ] pnpm exec knip --no-progress — zero references to JS names of dropped columns
[ ] NODE_OPTIONS=--max-old-space-size=8192 pnpm typecheck — passes
[ ] nest build — passes (catches side-effect/dynamic imports knip misses)
[ ] pnpm scan:legacy-actors:check — count decreased by expected amount
[ ] For AUTHORITY columns: e2e test passes for access allow + deny on the cutover path
[ ] pnpm check:tenant-isolation — count does not decrease (no new uncovered services)
[ ] pnpm check:record-access — passes
[ ] git diff --stat shows no un-reviewed schema files modified
```

---

## 11. Appendix — Invisible pg_catalog FKs (in-scope only)

Build raw SQL tables invisible to the ratchet (from `--catalog` output, 2026-08-30):

```
bugs.assignee_id
bugs.created_by
bugs.qa_owner_id
bugs.reporter_id
change_requests.approval_owner_id
change_requests.created_by
change_requests.requested_by_id
comment_drafts.user_id
cycles.created_by
employee_career_plans.mentor_id
employee_career_plans.user_id
expense_export_jobs.requested_by   [now has Drizzle counterpart]
feedbucket_submissions.assignee_id
feedbucket_widgets.created_by
form_submissions.submitted_by_id
git_connections.created_by
gl_books.created_by
gl_document_attachments.uploaded_by
gl_fx_rates.created_by
gl_journals.posted_by_user_id
gl_parties.created_by
gl_periods.locked_by
incident_updates.created_by
learning_paths.created_by
managed_product_releases.created_by
managed_products.owner_id
meeting_action_items.assignee_id
meeting_action_items.created_by
meeting_attendees.user_id
meeting_standup_entries.user_id
modules.created_by
modules.lead_id
okr_goals.created_by
okr_goals.owner_id
okr_updates.user_id
organizations.purge_scheduled_by
pages.created_by
project_approvals.approver_id
project_approvals.created_by
project_approvals.requested_by_id
project_decisions.created_by
project_decisions.owner_id
project_forms.created_by
project_incidents.created_by
project_incidents.owner_id
project_meetings.created_by
project_members.user_id
project_milestones.created_by
project_portfolios.created_by
project_portfolios.owner_id
project_programs.created_by
project_programs.owner_id
project_releases.created_by
project_risks.created_by
project_risks.owner_id
project_team_members.user_id
project_templates.created_by
project_views.created_by
project_webhooks.created_by
project_whiteboard_shares.user_id
project_workspace_members.user_id
projects.client_id
projects.manager_id
sprint_scope_events.actor_id
subprocessors.updated_by
test_cases.created_by
test_run_results.executed_by
test_runs.created_by
test_runs.tester_id
test_suites.created_by
ticket_activity_log.user_id
ticket_assignees.assigned_by
ticket_assignees.user_id
ticket_attachments.uploaded_by
ticket_checklist_items.assignee_id
ticket_comment_mentions.mentioned_user_id
ticket_comments.user_id
ticket_related_links.created_by
ticket_watchers.user_id
tickets.assignee_id
tickets.reporter_id
workflow_transitions.created_by
```

Note: Some of these have Drizzle-managed counterparts already (e.g., `ticket_assignees.user_id` has `membership_id` in the Build schema). The `--catalog` mode lists them as "invisible" because their raw SQL table definition is not in a Drizzle-managed `.ts` file — but the Drizzle-managed schema file may have the counterpart. Each must be individually verified before claiming zero-use proof.
