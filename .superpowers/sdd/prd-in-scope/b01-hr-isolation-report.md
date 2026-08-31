# B01 HR Isolation Report

## Coverage delta

| Metric | Value |
|---|---|
| Service files scanned | 811 tenant-owned |
| Isolation spec files | 190 |
| Covered (post-B01) | 488 / 811 (60%) |
| Pre-B01 baseline | ~20% |

## Files created

| File | Tests |
|---|---|
| `backend/src/modules/hr/recruitment/recruitment-tenant-isolation.spec.ts` | 34 |
| `backend/src/modules/hr/time/time-tenant-isolation.spec.ts` | 34 |
| `backend/src/modules/hr/performance/performance-tenant-isolation.spec.ts` | 30 |
| `backend/src/modules/hr/lifecycle/lifecycle-tenant-isolation.spec.ts` | 26 |
| `backend/src/modules/hr/directory/directory-tenant-isolation.spec.ts` | 20 |
| **Total** | **144 / 144 passing** |

## Services covered

### recruitment (17 services)
JobPostingsService, ApplicantsService, InterviewsService, RecruitmentCalibrationService, RecruitmentCandidateVaultService, OfferDocsService, RecruitmentOffersService, JobApplicationsService, PipelineService, RecruitmentOnboardingService, RecruitmentReferralChecksService, RecruitmentTemplatesService, CandidateScorecardsService, CareersPageService, JobPortalService, HiringAnalyticsService, RecruitmentFormsService

### time (17 services)
AttendancePolicyService, AttendanceRegularizationService, AttendanceService, CompOffGrantService, CompOffRequestsService, HolidaysService, LeaveAccrualsService, LeaveAllowancesService, LeaveBalancesService, LeavesApprovalService, LeavePoliciesService, LeavesService, ShiftsService, TimesheetAdjustmentsService, TimesheetsService, WorkLogsService, WorkSchedulesService

### performance (15 services)
FeedbackService, KpisService, CalibrationService, SuccessionService, EngagementBadgesService, EngagementMoodPollsService, EngagementService, OneOnOneMeetingsService, PerformancePipsService, PerformanceGoalsService, RichDocumentsService, EngagementCommunitiesCampaignsService, ComplianceService, DocumentsService, LettersService

### lifecycle (13 services)
DisciplinaryService, ExitInterviewsService, ExpatsService, GrievancesService, OffboardingService, ProbationService, PromotionsService, ResignationJobsService, SalaryRevisionsService, SeparationService, TerminationCommunicationsService, TerminationsService, TransfersService

### directory (10 services)
AccessRequestsService, AssetInventoryService, AssetsRecoveryService, BackgroundVerificationService, CelebrationsService, EmployeeMutationsService, EmployeeSkillsService, EmployeesService, OrgStructureService, TeamEventsService

## Real defects found

None. All production services correctly pass `orgId` to the DB query layer.

Notable patterns observed:
- `RecruitmentCandidateVaultService` uses an `ensureCandidate` guard that throws `NotFoundException` (not `ForbiddenException`) for cross-tenant IDs — correct BOLA behavior.
- `OrgStructureService.buildDirectory` isolates via `innerJoin(organizationMembers, eq(orgId))` rather than `where`; the `where` clause only carries `isActive` + scope.
- `EmployeeSkillsService.findExpert` uses a Drizzle CTE (`db.$with`) after the member query; with empty rows the service early-returns, so tests assert the initial `where` args.
- `WorkLogsService` queries `db.query.timesheets` (not `workLogs`) for its data.

## Out of scope (still missing in hr/)
- `src/modules/ai/core/services/hr-helpdesk-ai.service.ts`
- `src/modules/ai/core/services/hr-recruitment-ai.service.ts`

These live under `modules/ai/core/services/` — outside B01's exclusive territory.

## Technical notes

- All specs use direct constructor instantiation (no NestJS TestingModule) with a Thenable chain builder so that `await db.select().from().where()` resolves to the mocked rows at any chain depth.
- `db.transaction` mock invokes its callback with `db` as the transaction argument so `tx.select()` calls inside transactions work correctly.
- `sqlValues()` walker traverses Drizzle condition trees via `queryChunks` and `value` properties with a `seen` Set to handle circular references — never uses `JSON.stringify`.
- No production source files were modified.
