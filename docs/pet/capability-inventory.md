# Registered Tool inventory and companion exposure

**Source check:** 2026-10-08, `backend/src/modules/ai/core/tools/*-tools.ts`. This is an inventory of **73 source-declared keys across 16 providers**, not a claim that all work in a deployed environment. Registration, effective availability, object access, connected-account state, correct result, and end-to-end write behavior are separate gates. Re-run the inventory against the implementation branch before launch. The server-side Toolset intersects this review with current module flags, effective permissions, organization policy, and connection/owner checks.

`R` = read or generation/draft with no owner write found from the declared contract; still audit network/DB side effects. `C` = declared `confirms` action; validate owner receipt and idempotency. `B` = known immediate write; **block from the pet Toolset** until converted to a confirmable action. `N` = new Tool needed. All entries are `SOURCE PRESENT / RUNTIME UNVERIFIED` unless marked `N`.

| Source provider | R keys | C keys | B keys |
| --- | --- | --- | --- |
| `comms-actions-tools.ts` | — | `sendEmail`, `postChannelMessage`, `grantRecognition`, `grantBonus`, `archiveMailMessage` | — |
| `comms-copilot-tools.ts` | — | `scheduleEvent`, `sendDirectMessage` | — |
| `crm-copilot-tools.ts` | `searchLeads` | `updateLeadStatus`* | `createTask` |
| `hr-copilot-tools.ts` | `askHrPolicy`, `getHeadcountSummary`, `getAttritionSummary`, `draftPerformanceReviewNote`, `draftPromotionLetter`, `getMoodTrend`, `getLeaveUtilization` | — | — |
| `mail-copilot-tools.ts` | `listRecentEmails`, `summarizeMailThread` | `sendMailFromAccount` | — |
| `ops-copilot-tools.ts` | `getInventoryStock`, `getOrgPayrollSummary`, `getMyLeaveBalances` | — | — |
| `projects-copilot-tools.ts` | `readTicket`, `searchTickets` | `createTicket`, `updateTicketStatus`, `addTicketComment`, `createCalendarReminder` | — |
| `self-actions-tools.ts` | — | `applyForLeave`, `submitExpense`, `logTimesheetEntry`, `applyToJobOpening`, `submitReferral` | `clockIn`, `clockOut`, `toggleBreak` |
| `self-comms-tools.ts` | `getMyInbox`, `getMyNotificationCount`, `getMyAnnouncements` | — | — |
| `self-digest-tools.ts` | `summarizeMyDay`, `searchMyDocuments`** | — | — |
| `self-growth-tools.ts` | `getMyOnboardingTasks`, `getMyDisciplinaryCases`, `getMyGoals`, `getMyReviews`, `getMyHelpdeskItems` | — | — |
| `self-hr-tools.ts` | `getMyEmployment`, `getMyProfile`, `getMyAttendanceSummary`, `getMyAttendanceStatus`, `getMyLeaveRequests`, `getMyExpenses` | — | — |
| `self-payroll-tools.ts` | `getMyPayslips`, `getMyTotalRewards` | — | — |
| `self-work-tools.ts` | `getMyTickets`, `getMyTicketStats`, `getMyCreatedTickets`, `getMyReferrals`, `getMyTasks`, `getMyTimesheets`, `getMyJobApplications`, `getMyInterviews` | — | — |
| `work-actions-tools.ts` | — | `createLead`, `logCrmActivity`, `assignTicket`, `moveToCycle`, `createCalendarEvent`, `replyToMailThread` | — |
| `workspace-copilot-tools.ts` | `findPerson`, `getPersonTicketStats`, `getMyCalendarEvents`, `searchChatMessages` | — | — |

\* `updateLeadStatus` is confirmable but currently uses a first partial-name match; it is **blocked from pet exposure** until access-scoped disambiguation is fixed and proved.  
\** `searchMyDocuments` is a title/filename and limited excerpt search; it is **not** the proposed content-grounded Documents answer Tool.

## Required new owner capabilities

| Need | Owner and shape | Exposure gate |
| --- | --- | --- |
| `N`: Exact canonical BUG and all-issue aggregates | Build-owned aggregate/read Tool with explicit user-selected scope, type, state groups, true total, `asOf`, bounded preview, and matching filter link. | Non-owner DB and UI tests for custom statuses, deleted/archived/inaccessible projects, co-assignee dedupe, and count/view parity. |
| `N`: Bounded citable Documents context | Documents-owned read Tool/service extracted from existing retrieval/citation owner; Ask OS generates once. | One credit/transcript, bounded context, degradation, injection resistance, citation revocation and replay tests. |
| `N`: Prompt eligibility | Calendar occurrence, HR attendance eligibility, Notifications policy/outbox and pet preference composition. This is deterministic server work, **not** a model Tool. | Suppression, dedupe, expiry, delivery, privacy, and multi-device proof. |

## Per-capability launch review record

For **each key above**, the implementing team must record a row in the release inventory before enabling it. The fields are mandatory; omission means the key stays unavailable through the pet. This avoids treating a source list as a deployment allowlist.

| Field | Required decision/evidence |
| --- | --- |
| Identity and owner | Stable Tool key, provider, owning module/service, read/draft/proposal/write classification, source revision. |
| Availability | Effective permission grant, module flag, organization AI/capability policy, connection state, self subject/record-level reach. A missing `module` field in source is not permission to bypass owner checks. |
| Data and result | Input schema, entity resolution, max rows/bytes, sensitive data classification, output provenance/freshness, empty/denied/connection/ambiguous/failed cases, links that recheck access. |
| Side effect | `confirms` action, preview, exact target/recipient, expiry, owner command, duplicate redemption behavior, version conflict, receipt/deep link, audit correlation. Any DB write or external send without this stays blocked. |
| Operations | Expected query/provider cost, timeout, cancellation, retry rules, credit path, observability, tested role/project/tenant matrix. |
| Product | At least one safe suggestion and truthful unavailable/manual path, browser result states, accessibility verification, approved launch status/date and reviewer. |

## Exposure order

1. Ship the universal entry and verified read capabilities for each enabled pilot role cluster. Fail closed for source-present Tools whose object scope, result provenance, or cost is unreviewed. A read being blocked does not block the whole pet; explain its unavailable scope.
2. Enable individually verified `C` actions. Every pet write renders the typed directive/card and waits for the existing confirm endpoint. The user's free-text “yes” never redeems a proposal.
3. Keep `B` keys out of the pet's server Toolset until a new owner confirm action is registered and verified. Do not depend on model instructions or hidden UI to suppress them.
4. Add the two `N` read capabilities through Build and Documents, then validate representative cross-module answers. Do not infer a count from an existing capped list or answer policy questions from title-only search.
5. Reconcile this file against `collectToolDefinitions` and the confirm registry on every release. New keys default to **unreviewed and unavailable** until the row is approved; deleted keys disappear from suggestions.
