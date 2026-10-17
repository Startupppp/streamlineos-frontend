# Registered Tool inventory and companion exposure

**Source check:** 2026-10-09, `backend/src/modules/ai/core/tools/*-tools.ts` and `services/chat-assistant-inline-tools.ts`. There are **79 source-declared keys**: 75 across 16 providers and four inline Tools. The server review map in `registry/ask-os-tool-exposure.ts` allows reviewed reads/confirmable actions and blocks four inline Tools. This is source inventory, not proof that every capability works in a deployed environment. Registration, effective availability, object access, connected-account state, correct result, and end-to-end write behavior remain separate gates.

`R` = reviewed read or draft; still audit network/DB side effects. `C` = declared `confirms` action; validate owner receipt and idempotency. `B` = blocked by the server exposure map. These classifications describe the current source. Some named paths have [scratch database evidence](verification-and-competition.md#real-database-evidence-2026-10-09), but full browser, provider, role, and delivery acceptance remains open.

| Source provider | R keys | C keys | B keys |
| --- | --- | --- | --- |
| `comms-actions-tools.ts` | — | `sendEmail`, `postChannelMessage`, `grantRecognition`, `grantBonus`, `archiveMailMessage` | — |
| `comms-copilot-tools.ts` | — | `scheduleEvent`, `sendDirectMessage` | — |
| `crm-copilot-tools.ts` | `searchLeads` | `updateLeadStatus`, `createTask` | — |
| `hr-copilot-tools.ts` | `askHrPolicy`, `getHeadcountSummary`, `getAttritionSummary`, `draftPerformanceReviewNote`, `draftPromotionLetter`, `getMoodTrend`, `getLeaveUtilization` | — | — |
| `mail-copilot-tools.ts` | `listRecentEmails`, `summarizeMailThread` | `sendMailFromAccount` | — |
| `ops-copilot-tools.ts` | `getInventoryStock`, `getOrgPayrollSummary`, `getMyLeaveBalances` | — | — |
| `projects-copilot-tools.ts` | `readTicket`, `searchTickets`, `countTickets` | `createTicket`, `updateTicketStatus`, `addTicketComment`, `createCalendarReminder` | — |
| `self-actions-tools.ts` | — | `applyForLeave`, `submitExpense`, `logTimesheetEntry`, `applyToJobOpening`, `submitReferral`, `clockIn`, `clockOut`, `toggleBreak` | — |
| `self-comms-tools.ts` | `getMyInbox`, `getMyNotificationCount`, `getMyAnnouncements` | — | — |
| `self-digest-tools.ts` | `summarizeMyDay`, `searchMyDocuments`**, `searchDocumentContext` | — | — |
| `self-growth-tools.ts` | `getMyOnboardingTasks`, `getMyDisciplinaryCases`, `getMyGoals`, `getMyReviews`, `getMyHelpdeskItems` | — | — |
| `self-hr-tools.ts` | `getMyEmployment`, `getMyProfile`, `getMyAttendanceSummary`, `getMyAttendanceStatus`, `getMyLeaveRequests`, `getMyExpenses` | — | — |
| `self-payroll-tools.ts` | `getMyPayslips`, `getMyTotalRewards` | — | — |
| `self-work-tools.ts` | `getMyTickets`, `getMyTicketStats`, `getMyCreatedTickets`, `getMyReferrals`, `getMyTasks`, `getMyTimesheets`, `getMyJobApplications`, `getMyInterviews` | — | — |
| `work-actions-tools.ts` | — | `createLead`, `logCrmActivity`, `assignTicket`, `moveToCycle`, `createCalendarEvent`, `replyToMailThread` | — |
| `workspace-copilot-tools.ts` | `findPerson`, `getPersonTicketStats`, `getMyCalendarEvents`, `searchChatMessages` | — | — |
| `chat-assistant-inline-tools.ts` | — | — | `searchKnowledgeBase`, `askProjectAI`, `getProjectSummary`, `searchProjects` |

`updateLeadStatus` now returns an access-scoped ambiguity choice when multiple leads match; browser and non-owner database proof remains open. `searchMyDocuments` remains title/filename oriented; `searchDocumentContext` is the new bounded Documents content path. The four inline Tools remain blocked because three invoke nested paid generation and one searches projects without actor reach.

## Required new owner capabilities

| Need | Owner and shape | Exposure gate |
| --- | --- | --- |
| Implemented, unverified end to end: exact canonical BUG and all-issue aggregate | `countTickets` uses a Build-owned aggregate with explicit scope, type, state groups, total, `asOf`, and bounded preview. | Scratch DB checks totals and isolation. Matching filtered Build view and `href`, non-owner query plan, browser answer, and role breadth remain open. |
| Implemented, unverified end to end: bounded Documents context | `searchDocumentContext` uses Documents-owned citable context; Ask OS generates once. | Actual provider turn, one credit/transcript, access-checked citation click/replay, and revocation race remain open. |
| Implemented, unverified end to end: prompt eligibility | Calendar, HR, Notifications, and companion preference/prompt services compose deterministic eligibility. This is not a model Tool. | Focus/meeting/full-screen suppression, delivery, multi-device UI, privacy, and browser proof remain open. |

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
3. Keep the four `B` inline keys out of the server Toolset until their access and nested-generation problems are resolved. The former immediate self and CRM writes now have `confirms`, but still require owner receipt and live browser verification.
4. Validate `countTickets` and `searchDocumentContext` through representative model-driven and cross-module answers. Do not infer a count from a capped list or answer policy questions from title-only search.
5. Reconcile this file against `collectToolDefinitions` and the confirm registry on every release. New keys default to **unreviewed and unavailable** until the row is approved; deleted keys disappear from suggestions.
