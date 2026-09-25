# SESSION-10 — Pass-through wrapper cleanup (FE-126 / BE-143)

All 47 scanner candidates triaged: **12 deleted, 35 kept.** Two of the deletions were reverted
after `check-membership-writes.mjs` proved them load-bearing, which is why entries 1 and 2 below
sit under DELETED with a REVERTED status.

The line the triage drew: a wrapper whose body calls another **exported** function is dead
indirection and goes. A wrapper whose body touches a module-private `Set`, `Map`, regex, array or
unexported function is encapsulation — deleting it would force the private structure to be
exported, so it stays. A wrapper a gate script names by string is policy and stays.

---

## BACKEND

### DELETED

1. `bustMembershipsAfterOrgTeardown` → `scheduleMembershipBustMany`
   **STATUS: REVERTED — KEPT**
   Reason: Flagged by `node src/scripts/check-membership-writes.mjs` as a load-bearing gate boundary.
   `scheduleMembershipBust*` are private invalidation primitives; the wrappers are the only sanctioned entry points.
   See COORDINATOR message: "Revert these six files."

2. `bustMembershipAfterIdentityErasure` → `scheduleMembershipBust`
   **STATUS: REVERTED — KEPT**
   Same gate reason as above. Reverted per coordinator instruction.

3. `partitionDigestSql` (relocation-checksum.ts:109) → `tableDigestSql`
   **STATUS: DELETED**
   Callers updated: `relocation-checksum.spec.ts` (describe renamed, now tests `tableDigestSql` directly).
   Spec passes.

4. `classifyAddress` (e-sign/geo/address-classifier.ts:38) → `classifyIpAddress`
   **STATUS: DELETED (entire file address-classifier.ts deleted)**
   Callers updated:
   - `address-geo-ip.ts`: imports `classifyIpAddress` from `ssrf-guard`
   - `geo-ip.port.ts`: imports `IpAddressFamily`/`IpAddressScope` from `ssrf-guard`
   - `address-classifier.spec.ts`: tests `classifyIpAddress` directly
   Spec passes.

5. `resolveLocaleText` (email/templates/email-locale.ts:21) → `resolveLocaleValue`
   **STATUS: DELETED**
   Callers updated:
   - `auth.ts`: uses `resolveLocaleValue` directly
   - `payroll.ts`: uses `resolveLocaleValue` directly
   - `email-locale.spec.ts`: mocks `resolveLocaleValue`; bite test updated accordingly
   Spec passes.

6. `exportExecutionRead` (hr/import/hr-export-scope.ts:4) → `ScopedRead.of`
   **STATUS: DELETED (entire file hr-export-scope.ts deleted — was only export)**
   Callers updated:
   - `hr-export-jobs.service.ts`: imports `ScopedRead` (class, not `type`) and calls `ScopedRead.of(...)` directly

7. `catchWeightAmount` (inventory/stock-types/catch-weight.ts:68) → `mulDec`
   **STATUS: DELETED**
   Callers updated:
   - `stock-types.spec.ts`: imports `mulDec` from `decimal.ts`, calls it directly
   Spec passes.

### KEPT

8. `shouldSuppressForLifecycle` → `SUPPRESSED_LIFECYCLE_STATES.has()`
   KEPT: wraps module-private `Set`. Encapsulation exemption.

9. `isPlatformOnlyPermission` → `PLATFORM_ONLY_PERMISSION_KEYS.has()`
   KEPT: wraps module-private `Set`. Encapsulation exemption.

10. `moduleDefinition` → `BY_ID.get()`
    KEPT: wraps module-private `Map`. Encapsulation exemption.

11. `isPlanGatedModule` → `PLAN_GATED_MODULES.has()`
    KEPT: wraps module-private `Set`. Encapsulation exemption. Explicitly named in task instructions.

12. `isCrossCellEventType` → `ALLOWED.has()`
    KEPT: wraps module-private `Set`. Encapsulation exemption.

13. `findMappingPreset` → `BY_CODE.get()`
    KEPT: wraps module-private `Map`. Encapsulation exemption.

14. `isCurrencyCode` → `ISO_4217.test()`
    KEPT: wraps module-private regex. Encapsulation exemption. Explicitly named in task instructions.

15. `findConfirmableAction` → `BY_ACTION.get()`
    KEPT: wraps module-private `Map`. Encapsulation exemption.

16. `isEnvelopeEditable` → `ENVELOPE_EDITABLE_STATUSES.has()`
    KEPT: wraps module-private `Set`. Encapsulation exemption.

17. `isEnvelopeTerminal` → `ENVELOPE_TERMINAL_STATUSES.has()`
    KEPT: wraps module-private `Set`. Encapsulation exemption.

18. `isEnvelopeSignable` → `ENVELOPE_SIGNABLE_STATUSES.has()`
    KEPT: wraps module-private `Set`. Encapsulation exemption.

19. `disciplineLevel` → `DISCIPLINE_LADDER.indexOf()`
    KEPT: wraps module-private array's `.indexOf()`. Encapsulation exemption.

20. `defaultConfidentiality` → `CONFIDENTIAL_BY_DEFAULT_QUEUES.has()`
    KEPT: wraps module-private `Set`. Encapsulation exemption.

21. `managerMaySee` → `MANAGER_VISIBLE_FROM.includes()`
    KEPT: wraps module-private array. Encapsulation exemption.

22. `isImportType` → `IMPORT_TYPE_SET.has()`
    KEPT: wraps module-private `Set`. Encapsulation exemption.

23. `isWriteOffReason` (backend) → `WRITE_OFF_REASON_SET.has()`
    KEPT: wraps module-private `Set`. Encapsulation exemption.

24. `isTerminal` → `TERMINAL_ISSUE_STAGES.includes()`
    KEPT: wraps module-private array. Encapsulation exemption.

25. `isNotificationEventKey` → `EVENT_KEY_SET.has()`
    KEPT: wraps module-private `Set`. Encapsulation exemption.

26. `isScopable` → `SCOPABLE_PERMISSIONS.has()`
    KEPT: wraps module-private `Set`. Encapsulation exemption. Explicitly named in task instructions.

27. `parseStoredRequiredFields` → `storedRequiredFieldsSchema.parse()`
    KEPT: wraps a Zod schema object's `.parse()` method — a module-private data structure. Encapsulation exemption.

---

## FRONTEND

### DELETED

28. `formatCurrency` (lib/format-utils.ts:3) → `formatINRCompact`
    **STATUS: DELETED**
    Callers updated to use `formatINRCompact`:
    - `app/(authenticated)/crm/companies/[companyId]/page.tsx`
    - `app/(authenticated)/crm/deals/win-loss/page.tsx`
    - `app/(authenticated)/crm/leads/source-report/page.tsx`
    - `features/crm/import/bulk-import-section.tsx`
    Test mock updated: `win-loss/page.ap9.test.tsx`

29. `formatCommissionMoney` (features/crm/commissions/commission-format.ts:19) → `formatMinor`
    **STATUS: DELETED**
    Callers updated to import `formatMinor` from `@/lib/pricing-format`:
    - `features/crm/commissions/earnings-ledger.tsx`
    - `features/crm/commissions/accrual-working.tsx`
    - `features/crm/commissions/accrual-summary.tsx`

30. `formatReportMoney` (features/timesheets/reports/report-format.ts:11) → `formatCurrencyFull`
    **STATUS: DELETED**
    Callers updated to import `formatCurrencyFull` from `@/lib/format-utils`:
    - `features/timesheets/reports/client-profitability-tab.tsx`
    - `features/timesheets/reports/billing-leakage-tab.tsx`
    Unused `formatCurrencyFull` import removed from `report-format.ts`.

31. `toUpdatePartyInput` (features/accounting/parties/party-schema.ts:103) → `toCreatePartyInput`
    **STATUS: DELETED**
    `UpdatePartyInput = Partial<CreatePartyInput>`: structurally compatible, no meaningful type narrowing.
    Callers updated:
    - `features/accounting/parties/party-form-sheet.tsx`: uses `toCreatePartyInput` directly
    Unused `UpdatePartyInput` import removed from `party-schema.ts`.

32. `toUpdateDocumentInput` (features/accounting/sales/ar-document-schema.ts:198) → `toCreateDocumentInput`
    **STATUS: DELETED**
    `UpdateArDraftInput extends Partial<ArDocumentHeaderInput>` vs `CreateInvoiceInput extends ArDocumentHeaderInput`:
    `CreateInvoiceInput` is assignable to `UpdateArDraftInput`; callers can use `toCreateDocumentInput` directly.
    Callers updated:
    - `features/accounting/sales/invoice-detail-client.tsx`
    - `features/accounting/sales/credit-note-detail-client.tsx`
    Unused `UpdateArDraftInput` import removed from `ar-document-schema.ts`.

33. `fromSavedViewLayout` (lib/build/view-types.ts:53) → `parseViewType`
    **STATUS: DELETED**
    Callers updated to use `parseViewType` directly:
    - `features/build/views/use-board-url-state.ts`
    - `features/build/views/saved-views-menu.tsx`
    - `lib/build/view-types.test.ts`
    Spec passes.

34. `attendancePollInterval` (features/hr/attendance/attendance-utils.ts:15) → `activeAttendancePollInterval`
    **STATUS: DELETED**
    Callers updated:
    - `features/hr/attendance/__tests__/attendance-poll.test.ts`: imports `activeAttendancePollInterval` from `@/lib/query-request-policies` directly
    Spec passes.

### KEPT

35. `isCalendarToolkit` → `CALENDAR_TOOLKITS.includes()`
    KEPT: wraps module-private array. Encapsulation exemption.

36. `isStepId` → `VALID_STEP_IDS.has()`
    KEPT: wraps module-private `Set`. Encapsulation exemption.

37. `statusLabel` → `humanizeCode()`
    KEPT: `humanizeCode` is NOT exported (no `export` keyword). Module-private function. Encapsulation exemption.

38. `isValidHexColor` (lib/column-colors.ts:48) → `HEX_COLOR.test()`
    KEPT: wraps module-private regex. Encapsulation exemption.

39. `isValidCountry` → `ALL_COUNTRIES.includes()`
    KEPT: wraps module-private array. Encapsulation exemption.

40. `isValidIndianState` → `INDIAN_STATE_NAMES.includes()`
    KEPT: wraps module-private array. Encapsulation exemption.

41. `moduleById` → `byId.get()`
    KEPT: wraps module-private `Map`. Encapsulation exemption. Explicitly named in task instructions.

42. `moduleByProductKey` → `byProductKey.get()`
    KEPT: wraps module-private `Map`. Encapsulation exemption.

43. `isLineRows` → `Array.isArray()`
    KEPT: type predicate (`value is RecordLine[]`). Narrows type beyond what `Array.isArray()` provides alone. Earns its keep through type narrowing.

44. `isWriteOffReason` (frontend hooks) → `WRITE_OFF_REASON_SET.has()`
    KEPT: wraps module-private `Set`. Encapsulation exemption.

45. `isNotificationList` → `Array.isArray()`
    KEPT: type predicate (`data is Notification[]`). Narrows type. Earns its keep through type narrowing.

46. `isActiveExecution` → `ACTIVE_EXECUTION_STATUSES.has()`
    KEPT: wraps module-private `Set`. Encapsulation exemption.

47. `isValidHexColor` (components/labels/label-colors.ts:18) → `HEX_COLOR.test()`
    KEPT: wraps module-private regex. Encapsulation exemption.

---

## GATE STATUS

- `check-membership-writes`: PASS (1 pre-existing violation at `src/test/hrms-kb-seed.spec-fixtures.ts:50`, unchanged from main)
- Specs run and passing: `relocation-checksum.spec.ts`, `stock-types.spec.ts`, `email-locale.spec.ts`, `membership-mutations.spec.ts`, `address-classifier.spec.ts`, `view-types.test.ts`, `attendance-poll.test.ts`
- Full typecheck: PENDING ORCHESTRATOR GATE (not run per coordinator instruction to avoid overloading the shared machine)
