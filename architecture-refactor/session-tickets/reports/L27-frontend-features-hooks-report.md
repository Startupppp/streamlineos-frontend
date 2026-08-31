STATUS: PARTIAL — explicit gaps closed; broad accounting hook sweep is OPEN.

HOOKS GATED (keys verified in both catalogs before use):
- hooks/api/ai-credits.ts: useAiCreditsWallet, useAiCreditTransactions, useAiCreditsUsage → enabled: useCan("billing:ai-credits:view")
- hooks/api/automations.ts: useAutomations, useAutomationRuns → enabled: useCan("settings:automations:view")
- hooks/api/build/workflow.ts: useWorkflowTransitions already gated with "build:workflow:view" (VERIFIED DONE). The 4 mutations (useCreateTransition, useUpdateTransition, useDeleteTransition, useUpdateStatusWip) are mutations — React Query mutations have no `enabled` flag; gate is UI-level useCan in calling components (FALSE PREMISE for mutations needing internal gates).

HOOKS DELIBERATELY UNIVERSAL (untouched per product contract):
- All hooks in hooks/api/notifications/inbox/, hooks/api/chat*, hooks/api/kb/ask.ts, hooks/api/surveys/public-runtime.ts, and /me/* self-service hooks remain ungated.

FILES SPLIT (before → after line counts):
- hooks/api/crm-settings.ts: 530 → 7 (barrel) + 5 domain files: assignment-rules.ts 152, email-templates.ts 74, scoring-rules.ts 75, sla.ts 110, territories.ts 115
- features/accounting/sales/invoice-detail-view.tsx: 586 → 305 (panels extracted to invoice-detail-panels.tsx 236)
- features/hr/performance/reviews-tab.tsx: 511 → 361 (form fields extracted to review-form-fields.tsx 200)

COHESIVE EXCEPTIONS (no clean seam confirmed):
- features/chat/channel-sidebar.tsx 535: single complex component, 36 useState/useEffect calls, no sub-component seam
- features/chat/huddle-panel.tsx 513: single exported function, 24 hook calls, no seam
- features/calendar/calendar-view.tsx 506: one export at line 67, no named sub-components
- features/hr/leaves/components/leaves-wfh-content.tsx 503: LeavesSummaryStrip sub-component (42 lines) too small to reduce main below 500
- features/crm/import/planned-import-section.tsx 523: excluded domain, 445-line main component with only 28-line helpers at end
- hooks/api/inventory/reports.ts 510: excluded domain, private transforms tightly coupled to 5 hooks

MISSING CATALOG KEYS TO ROUTE: None — all keys used were verified in both catalogs.

OPEN: ~15 accounting hook files (ap-vendors, ap, ar, ar-collections, assets, banking, core, dimensions, expenses, fin-settings, insights, overview, planning, reports, settings, taxes, accounting.ts root) contain ungated useQuery calls. Gating requires verifying exact permission keys per endpoint — too high blast-radius to do without per-endpoint catalog audit. Recommend a follow-up lane.

TEST SUMMARY: 3 jest tests pass (reviews-tab pagination). pnpm type-check clean. check:query-scope, check:effect-fetches, check:formatters, check:empty-states, check:icon-labels, check:dead-code all pass.
