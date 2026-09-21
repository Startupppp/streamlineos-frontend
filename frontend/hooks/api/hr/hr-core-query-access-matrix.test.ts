import { readFileSync } from "node:fs";
import { join } from "node:path";

type QueryAccessCase = readonly [
  fileName: string,
  hookName: string,
  endpoint: string,
  permissions: string,
  requiresHrModule: boolean,
];

const queryAccessCases: readonly QueryAccessCase[] = [
  ["employee-departments.ts", "useHrDepartments", "/hr/departments", "hr:employees:view", true],
  ["employee-list.ts", "useHrEmployees", "/hr/employees", "hr:employees:view", true],
  ["employee-list.ts", "useInfiniteHrEmployees", "/hr/employees", "hr:employees:view", true],
  ["employee-list.ts", "useHrEmployeeCounts", "/hr/employees/counts", "hr:employees:view", true],
  ["employee-insights.ts", "useHrEmployeeStats", "/hr/employees/stats", "hr:employees:view", true],
  ["employee-insights.ts", "useHrEmployeeProjects", "/hr/employees/projects", "hr:employees:view", true],
  ["employee-insights.ts", "useHrEmployeeTickets", "/hr/employees/tickets", "hr:employees:view", true],
  ["employee-insights.ts", "useEmployeeAvailability", "/hr/employees/availability", "hr:employees:view", true],
  ["employee-insights.ts", "useFindExpert", "/hr/employees/find-expert", "hr:employees:view", true],
  ["employee-insights.ts", "useSkillsMatrix", "/hr/employees/skills-matrix", "hr:employees:view", true],
  ["employee-insights.ts", "useDirectReports", "/reports-to-me", "hr:employees:view", true],
  ["employee-insights.ts", "useManagerScorecard", "/manager-scorecard", "hr:employees:view", true],
  ["employee-profile.ts", "useEmployeeEmployment", "/employment", "hr:employees:view", true],
  ["employee-profile.ts", "useEmployeeTimeline", "/timeline", "hr:employees:view", true],
  ["employee-profile.ts", "useEmployeeSensitive", "/sensitive", "hr:sensitive:view", true],
  ["hr-org.ts", "useOrgJobRoles", "/hr/org/roles", "hr:employees:view", true],
  ["hr-org.ts", "useOrgJobLevels", "/hr/org/levels", "hr:employees:view", true],
  ["hr-org.ts", "useOrgHeadcount", "/hr/org/headcount", "hr:employees:view", true],
  ["attendance.ts", "useHrAttendanceStatus", "/me/attendance/status", "self:attendance", false],
  ["attendance.ts", "useHrAttendanceHistory", "/me/attendance/history", "self:attendance", false],
  ["attendance.ts", "useHrMonthlyAttendance", "/hr/attendance/monthly", "self:attendance|hr:attendance:view", true],
  ["attendance.ts", "useGetWorkLogs", "/hr/work-logs", "hr:attendance:view", true],
  ["attendance.ts", "useHrTeamAttendanceStatus", "/hr/attendance/team-status", "hr:attendance:view", true],
  ["comp-off.ts", "useCompOff", "/hr/overtime/comp-off", "hr:attendance:view", true],
  ["biometric.ts", "useBiometricDevices", "/hr/biometric/devices", "hr:attendance:manage", true],
  ["biometric.ts", "useBiometricLogs", "/hr/biometric/logs", "hr:attendance:view", true],
  ["geofencing.ts", "useGeofences", "/hr/geofencing", "hr:attendance:view", true],
  ["holidays.ts", "useHolidays", "/me/attendance/holidays", "self:attendance", false],
  ["overtime.ts", "useOvertimeRequests", "/hr/overtime", "hr:attendance:view", true],
  ["overtime.ts", "useCompOffBalance", "/hr/overtime/comp-off", "hr:attendance:view", true],
  ["rosters.ts", "useRosters", "/hr/rosters", "hr:attendance:view", true],
  ["rosters.ts", "useRosterEntries", "/entries", "hr:attendance:view", true],
  ["shifts.ts", "useHrShifts", "/hr/shifts", "hr:attendance:view", true],
  ["shifts.ts", "useShiftAssignments", "/hr/shifts/assignments", "hr:attendance:view", true],
  ["shifts.ts", "useShiftSwaps", "/hr/shifts/swaps", "hr:attendance:view", true],
  ["hr-settings.ts", "useHrPerformanceReviews", "/hr/performance/reviews", "hr:performance:view", true],
  ["hr-settings.ts", "useHrWfhRequests", "/me/time-off/wfh", "self:attendance", false],
  ["hr-settings.ts", "useHrPendingWfhRequests", "/hr/wfh/pending", "hr:attendance:manage", true],
  ["leaves.ts", "useLeaveTypesAdmin", "/hr/leaves/types", "hr:leaves:view", true],
  ["leaves.ts", "useHrLeaveContext", "/me/time-off", "self:leaves", false],
  ["leaves.ts", "useHrLeaveApprovals", "/hr/leaves/team", "hr:leaves:view", true],
  ["leaves.ts", "useHrLeavesThisWeek", "/me/time-off/team-calendar", "self:leaves", false],
  ["leaves.ts", "useHrMyLeaveRequests", "/me/time-off/requests", "self:leaves", false],
  ["leaves.ts", "useHrMyLeaveRequestsInfinite", "/me/time-off/requests", "self:leaves", false],
  ["leaves.ts", "useHrHolidaysForYear", "/hr/holidays", "hr:attendance:view", true],
  ["leaves.ts", "useHrHolidaysForCalendar", "/hr/holidays/calendar", "hr:attendance:view", true],
  ["leaves.ts", "useHrLeaveAnalytics", "/hr/leaves/analytics", "hr:leaves:view", true],
  ["leaves.ts", "useLeavePolicy", "/hr/leave-policy", "hr:leaves:view", false],
  ["leave-policies.ts", "useLeavePolicies", "/hr/leave-policies", "hr:leaves:view", false],
  ["documents.ts", "useHrDocumentList", "/hr/documents", "hr:documents:view", true],
  ["documents.ts", "useHrDocumentStats", "/hr/documents/stats", "hr:documents:view", true],
  ["documents.ts", "useHrDocumentExpiry", "/hr/document-expiry", "hr:documents:view", true],
  ["documents.ts", "useMyOnboardingDocs", "/hr/onboarding-docs/me", "self:onboarding-docs", false],
  ["documents.ts", "useMissingOnboardingDocsCount", "/hr/onboarding-docs/summary", "hr:onboarding:manage", false],
  ["document-templates.ts", "useDocumentTemplates", "/hr/documents/templates", "hr:documents:view", true],
  ["document-templates.ts", "useDocumentTemplate", "/hr/documents/templates/", "hr:documents:view", true],
  ["document-templates.ts", "useDocumentTemplateVersions", "/versions", "hr:documents:view", true],
  ["document-types.ts", "useHrDocumentTypes", "/hr/document-types", "hr:documents:manage|hr:documents:view|self:onboarding-docs", false],
  ["document-types.ts", "useHrDocumentTypesPage", "/hr/document-types", "hr:documents:manage", false],
  ["letters.ts", "useLetters", "/hr/documents/letters", "hr:documents:view", true],
  ["rich-documents.ts", "useRichDocuments", "/hr/rich-documents", "hr:documents:view", true],
  ["rich-documents.ts", "useRichDocument", "/hr/rich-documents/", "hr:documents:view", true],
  ["onboarding.ts", "useOnboardingStatus", "/onboarding", "hr:onboarding:manage", false],
  ["onboarding.ts", "useUserOnboarding", "/onboarding/", "hr:onboarding:tasks:view", false],
  ["onboarding.ts", "useMyOnboarding", "/onboarding/me", "self:onboarding-tasks", true],
  ["onboarding.ts", "useOnboardingTemplateDepartments", "/onboarding/templates/departments", "hr:onboarding:manage", false],
  ["onboarding.ts", "useHrOnboardingTemplates", "/onboarding/templates", "hr:onboarding:manage", false],
  ["probation.ts", "useProbationList", "/hr/probation", "hr:probation:view", true],
  ["exit.ts", "useResignations", "/hr/exit", "hr:exit:view", true],
  ["exit.ts", "useResignationProgress", "/progress", "hr:exit:view", true],
  ["termination.ts", "useTerminations", "/hr/termination", "hr:exit:manage", true],
  ["import-export.ts", "useHrImportJobs", "/hr/import/jobs", "hr:import:manage", true],
  ["import-export.ts", "useHrImportJob", "/hr/import/jobs/", "hr:import:manage", true],
  ["import-export.ts", "useHrEmployeeExportJob", "/hr/export/jobs/", "hr:export:manage", true],
  ["hr-templates.ts", "useHrTemplates", "/hr/templates", "hr:templates:view", true],
  ["hr-templates.ts", "useHrTemplate", "/hr/templates/", "hr:templates:view", true],
  ["hr-templates.ts", "useHrTemplateVariables", "/hr/templates/variables", "hr:templates:view", true],
  ["dashboard.ts", "useHrDashboardMetrics", "/hr/dashboard/metrics", "hr:analytics:read", true],
  ["dashboard.ts", "useHrLeaveCalendar", "/hr/leave-calendar", "hr:leaves:read", false],
  ["dashboard.ts", "useHrOnboardingStatus", "/hr/dashboard/onboarding-status", "hr:analytics:read", true],
];

function hookSource(fileName: string, hookName: string): string {
  const source = readFileSync(
    join(process.cwd(), "hooks", "api", "hr", fileName),
    "utf8",
  );
  const marker = `export function ${hookName}(`;
  const start = source.indexOf(marker);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = source.indexOf("\nexport function ", start + marker.length);
  return source.slice(start, next === -1 ? undefined : next);
}

describe("HRMS core query access matrix", () => {
  it.each(queryAccessCases)(
    "%s %s mirrors %s access",
    (fileName, hookName, endpoint, permissions, requiresHrModule) => {
      const source = hookSource(fileName, hookName);
      expect(source).toContain(endpoint);
      for (const permission of permissions.split("|"))
        expect(source).toContain(`useCan("${permission}")`);
      expect(source).toMatch(/\benabled\s*[:,]/);
      if (requiresHrModule) expect(source).toContain('useModuleEnabled("hr")');
      else expect(source).not.toContain('useModuleEnabled("hr")');
    },
  );
});
