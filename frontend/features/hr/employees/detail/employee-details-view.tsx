"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHydrated } from "@/hooks/common/use-hydrated";
import dynamic from "next/dynamic";
import { EditEmployeeForm, type EmployeeData } from "@/features/hr/employees/detail/edit-employee-form";
import { EmployeeAttendanceHistory } from "@/components/hr/employee-attendance-history";
import { SelfEditProfileForm } from "@/components/hr/self-edit-profile-form";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ScrollEdgeFade } from "@/components/ui/scroll-edge-fade";
import {
  useHrEmployeeStats,
  useHrEmployeeProjects,
  useHrEmployeeTickets,
  useEmployeeEmployment,
  useExportEmployeePdf,
} from "@/hooks/api/hr";
import { EmployeeTicketsList } from "@/components/hr/employee-tickets-list";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, UserX, Download } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCan } from "@/hooks/api/access";
import { canDeleteEmployee } from "@/features/hr/employees/hr-types";
import { AiActionsMenu } from "@/components/ai";
import type { AiAction } from "@/components/ai";
import { useAIAttritionRisk, useAIGenerateReview } from "@/hooks/api/ai";
import { EmployeeHeaderCard } from "@/features/hr/employees/detail/employee-header-card";
import { OverviewTab } from "@/features/hr/employees/detail/overview-tab";
import { EmployeeTabsList } from "@/features/hr/employees/detail/employee-tabs-list";
import { LIFECYCLE_BADGE, profileCompletenessScore } from "@/features/hr/employees/detail/employee-detail-constants";

const EmployeeTimelineTab = dynamic(
  () => import("@/features/hr/employees/detail/timeline-tab").then(m => ({ default: m.EmployeeTimelineTab })),
  { loading: () => <div className="space-y-3">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div> }
);
const EmployeeSensitiveTab = dynamic(
  () => import("@/features/hr/employees/detail/sensitive-tab").then(m => ({ default: m.EmployeeSensitiveTab })),
  { loading: () => <div className="space-y-3">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div> }
);

export function EmployeeDetailsView({ employee }: { employee: EmployeeData }) {
  const hydrated = useHydrated();
  const { data: stats, isLoading: statsLoading } = useHrEmployeeStats(employee.id);
  const { data: projects } = useHrEmployeeProjects(employee.id);
  const { data: ticketsResult } = useHrEmployeeTickets(employee.id);
  const { data: employmentRecord } = useEmployeeEmployment(employee.id);
  const router = useRouter();
  const { data: session } = useSession();
  const canManageEmployees = useCan("hr:employees:manage");
  const canUpdateEmployee = useCan("hr:employees:update");
  const canViewSensitive = useCan("hr:sensitive:view");
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") ?? "overview";
  const [activeTab, setActiveTab] = useState(defaultTab);
  const tabsListRef = useRef<HTMLDivElement>(null);
  const leaveGuardRef = useRef<{
    isDirty: boolean;
    requestLeave: (action: () => void) => void;
  } | null>(null);

  const registerLeaveGuard = useCallback(
    (
      api: {
        isDirty: boolean;
        requestLeave: (action: () => void) => void;
      } | null,
    ) => {
      leaveGuardRef.current = api;
    },
    [],
  );

  const isSelf = hydrated && session?.user?.id === employee.id;
  const showManageActions = hydrated && canManageEmployees;
  const showSensitiveTab = hydrated && canViewSensitive;
  const employeeName =
    `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim() || "Employee";

  const scrollActiveTabIntoView = useCallback(() => {
    const active = tabsListRef.current?.querySelector<HTMLElement>(
      '[data-state="active"]',
    );
    active?.scrollIntoView({
      inline: "nearest",
      block: "nearest",
      behavior: "smooth",
    });
  }, []);

  useEffect(() => {
    scrollActiveTabIntoView();
  }, [activeTab, showSensitiveTab, isSelf, scrollActiveTabIntoView]);

  const requestLeaveIfNeeded = useCallback((action: () => void) => {
    const guard = leaveGuardRef.current;
    if (guard?.isDirty) {
      guard.requestLeave(action);
      return;
    }
    action();
  }, []);

  const skillsList: string[] = (employee.skills ?? []).map((s) => s.name);

  const { pct: completeness, missing: missingFields } = profileCompletenessScore(employee);

  const nestedEmployment =
    employee.employment && typeof employee.employment === "object"
      ? (employee.employment as {
          lifecycleStatus?: string;
          employeeNumber?: string | null;
          workerType?: string | null;
        })
      : null;
  const lifecycleStatus =
    employmentRecord?.lifecycleStatus ??
    nestedEmployment?.lifecycleStatus ??
    (typeof employee.employmentStatus === "string" ? employee.employmentStatus : null);
  const rawEmployeeNumber =
    employmentRecord?.employeeNumber ??
    nestedEmployment?.employeeNumber ??
    (typeof employee.employeeId === "string" ? employee.employeeId : null);
  const employeeNumber =
    typeof rawEmployeeNumber === "string" && rawEmployeeNumber.trim()
      ? rawEmployeeNumber
      : null;
  const workerType = employmentRecord?.workerType ?? nestedEmployment?.workerType ?? null;

  const handleTerminateClick = useCallback(() => {
    router.push(`/hr/termination?employeeId=${employee.id}`);
  }, [employee.id, router]);

  const handleBack = useCallback(() => {
    requestLeaveIfNeeded(() => router.back());
  }, [requestLeaveIfNeeded, router]);

  const handleTabChange = useCallback(
    (next: string) => {
      requestLeaveIfNeeded(() => {
        setActiveTab(next);
        requestAnimationFrame(scrollActiveTabIntoView);
      });
    },
    [requestLeaveIfNeeded, scrollActiveTabIntoView],
  );

  const attritionRiskMutation = useAIAttritionRisk();
  const generateReviewMutation = useAIGenerateReview();

  const exportPdfMutation = useExportEmployeePdf(employee.id, employeeName, {
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const handleExportPdf = useCallback(() => {
    exportPdfMutation.mutate();
  }, [exportPdfMutation]);

  const aiActions = useMemo<AiAction[]>(() => {
    if (!canManageEmployees) return [];
    return [
      {
        key: "attrition-risk",
        label: "Attrition insight (advisory)",
        description: "AI-estimated attrition risk and retention actions",
        run: async () => {
          const result = await attritionRiskMutation.mutateAsync(employee.id);
          return {
            text: `Risk level: ${result.riskLevel} (${result.attritionRiskScore}/100)\n\nReasoning: ${result.reasoning}\n\nRisk factors:\n${result.riskFactors.map((f) => "• " + f).join("\n")}\n\nRetention actions:\n${result.retentionActions.map((a) => "• " + a).join("\n")}\n\n⚠ Advisory only. This is an AI estimate — all people decisions require human judgment.`,
          };
        },
      },
      {
        key: "draft-review",
        label: "Draft performance review",
        description: "Generate a performance review draft for this employee",
        run: async () => {
          const result = await generateReviewMutation.mutateAsync({
            userId: employee.id,
            periodStart: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            periodEnd: new Date().toISOString().slice(0, 10),
          });
          return {
            text: `Overall: ${result.overallRating}/5\n\nStrengths:\n${result.strengths}\n\nAreas for improvement:\n${result.improvements}\n\nComments:\n${result.comments}\n\nCategory ratings:\n${result.ratings.map((r) => `• ${r.category}: ${r.score}/5 — ${r.comment}`).join("\n")}`,
          };
        },
      },
    ];
  }, [canManageEmployees, employee.id, attritionRiskMutation, generateReviewMutation]);

  const employmentStatusRaw = employee.employmentStatus;
  const employmentStatus =
    typeof employmentStatusRaw === "string"
      ? employmentStatusRaw.toUpperCase()
      : null;
  const isAlreadyTerminated =
    employee.isActive === false || employmentStatus === "TERMINATED";
  const canTerminate =
    hydrated &&
    !isAlreadyTerminated &&
    canDeleteEmployee(
      employee.role ?? "",
      employee.id,
      true,
      session?.user?.id,
      canUpdateEmployee,
    );

  const lifecycleBadgeLabel = lifecycleStatus
    ? (LIFECYCLE_BADGE[lifecycleStatus]?.label ?? lifecycleStatus)
    : null;

  const showEmploymentActiveBadge =
    !isAlreadyTerminated &&
    (!lifecycleBadgeLabel || lifecycleBadgeLabel.toUpperCase() !== "ACTIVE");

  const legacyEmployeeId =
    typeof employee.employeeId === "string" ? employee.employeeId.trim() : "";
  const showLegacyEmployeeId =
    !!legacyEmployeeId && legacyEmployeeId !== (employeeNumber ?? "").trim();

  return (
    <PageWrapper
      leading={
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 h-9 shrink-0 gap-1.5 px-2.5 sm:h-8"
          onClick={handleBack}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Button>
      }
      title={
        <>
          <span className="sr-only sm:hidden">{employeeName}</span>
          <span className="hidden sm:inline">{employeeName}</span>
        </>
      }
      actionsInline
      actions={
        <div className="flex items-center gap-1.5">
          {showManageActions && (
            <LoadingButton
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 px-2.5 sm:h-8"
              isPending={exportPdfMutation.isPending}
              loadingText="…"
              onClick={handleExportPdf}
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export PDF</span>
              <span className="sm:hidden">PDF</span>
            </LoadingButton>
          )}
          {canTerminate && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 border-destructive/30 px-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive sm:h-8"
              onClick={handleTerminateClick}
            >
              <UserX className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Terminate</span>
            </Button>
          )}
          {showManageActions && aiActions.length > 0 && (
            <AiActionsMenu actions={aiActions} menuLabel="HR AI assist" />
          )}
        </div>
      }
      contentClassName="flex flex-col gap-4"
    >
      <EmployeeHeaderCard
        employee={employee}
        stats={stats}
        statsLoading={statsLoading}
        isSelf={isSelf}
        completeness={completeness}
        missingFields={missingFields}
        lifecycleStatus={lifecycleStatus ?? null}
        employeeNumber={employeeNumber}
        workerType={workerType}
        isAlreadyTerminated={isAlreadyTerminated}
        showEmploymentActiveBadge={showEmploymentActiveBadge}
        showLegacyEmployeeId={showLegacyEmployeeId}
        legacyEmployeeId={legacyEmployeeId}
      />

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex flex-col gap-4"
      >
        <ScrollEdgeFade className="shrink-0">
          <EmployeeTabsList
            ref={tabsListRef}
            showSensitiveTab={showSensitiveTab}
            isSelf={isSelf}
          />
        </ScrollEdgeFade>

        <TabsContent value="overview" className="mt-0 flex-none">
          <OverviewTab
            employeeId={employee.id}
            skillsList={skillsList}
            projects={(projects ?? []) as Record<string, unknown>[]}
            tickets={
              (ticketsResult?.data ?? []) as Parameters<
                typeof EmployeeTicketsList
              >[0]["tickets"]
            }
          />
        </TabsContent>

        <TabsContent value="attendance" className="mt-0 flex-none">
          <div className="pb-6">
            <EmployeeAttendanceHistory userId={employee.id} />
          </div>
        </TabsContent>

        <TabsContent value="timeline" className="mt-0 flex-none">
          <div className="pb-4">
            <EmployeeTimelineTab userId={employee.id} />
          </div>
        </TabsContent>

        {showSensitiveTab && (
          <TabsContent value="sensitive" className="mt-0 flex-none">
            <div className="pb-4">
              <EmployeeSensitiveTab userId={employee.id} />
            </div>
          </TabsContent>
        )}

        {isSelf && (
          <TabsContent value="my-profile" className="mt-0 flex-none">
            <div className="pb-4">
              <SelfEditProfileForm
                employee={{
                  id: employee.id,
                  firstName: employee.firstName,
                  lastName: employee.lastName,
                  image: typeof employee.image === "string" ? employee.image : null,
                  bio: typeof employee.bio === "string" ? employee.bio : null,
                  linkedinUrl: typeof employee.linkedinUrl === "string" ? employee.linkedinUrl : null,
                  twitterUrl: typeof employee.twitterUrl === "string" ? employee.twitterUrl : null,
                  githubUrl: typeof employee.githubUrl === "string" ? employee.githubUrl : null,
                  websiteUrl: typeof employee.websiteUrl === "string" ? employee.websiteUrl : null,
                  skills: employee.skills,
                }}
                onSaved={() => router.refresh()}
                registerLeaveGuard={
                  activeTab === "my-profile" ? registerLeaveGuard : undefined
                }
              />
            </div>
          </TabsContent>
        )}

        <TabsContent value="profile" className="mt-0 flex-none pb-4">
          <EditEmployeeForm
            employee={employee}
            registerLeaveGuard={
              activeTab === "profile" ? registerLeaveGuard : undefined
            }
          />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
