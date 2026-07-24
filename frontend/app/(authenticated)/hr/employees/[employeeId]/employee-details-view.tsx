"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useHydrated } from "@/hooks/common/use-hydrated";
import dynamic from "next/dynamic";
import { EditEmployeeForm, type EmployeeData } from "./edit-employee-form";
import { EmployeeAttendanceHistory } from "@/components/hr/employee-attendance-history";
import { SelfEditProfileForm } from "@/components/hr/self-edit-profile-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollEdgeFade } from "@/components/ui/scroll-edge-fade";
import {
  useHrEmployeeStats,
  useHrEmployeeProjects,
  useHrEmployeeTickets,
  useDirectReports,
  useManagerScorecard,
  useEmployeeAvailability,
  useEmployeeEmployment,
} from "@/hooks/api/hr";
import { EmployeeProjectsList } from "@/components/hr/employee-projects-list";
import { EmployeeTicketsList } from "@/components/hr/employee-tickets-list";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  UserX,
  Mail,
  Phone,
  Download,
  Building2,
  Calendar,
  Briefcase,
  Clock,
  FileCheck,
  Tag,
  Users,
  BarChart2,
  UserCircle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCan } from "@/hooks/api/access";
import { resolveImageUrl, cn } from "@/lib/utils";
import { format } from "date-fns";
import { canDeleteEmployee } from "@/features/hr/employees/hr-types";
import { TruncatedText } from "@/components/ui/truncated-text";
import { AiActionsMenu } from "@/components/ai";
import type { AiAction } from "@/components/ai";
import { useAIAttritionRisk, useAIGenerateReview } from "@/hooks/api/ai";

const EmployeeTimelineTab = dynamic(
  () => import("@/features/hr/employees/detail/timeline-tab").then(m => ({ default: m.EmployeeTimelineTab })),
  { loading: () => <div className="space-y-3">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}</div> }
);
const EmployeeSensitiveTab = dynamic(
  () => import("@/features/hr/employees/detail/sensitive-tab").then(m => ({ default: m.EmployeeSensitiveTab })),
  { loading: () => <div className="space-y-3">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div> }
);

function getInitials(first?: string | null, last?: string | null) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

function profileCompletenessScore(employee: EmployeeData): {
  pct: number;
  missing: string[];
} {
  const fields: Array<{ label: string; filled: boolean }> = [
    { label: "First name", filled: !!employee.firstName },
    { label: "Last name", filled: !!employee.lastName },
    { label: "Phone", filled: !!employee.phone },
    { label: "Designation", filled: !!employee.designation },
    {
      label: "Profile photo",
      filled: !!employee.image,
    },
    { label: "Bio", filled: !!employee.bio },
    {
      label: "Skills",
      filled: (employee.skills ?? []).length > 0,
    },
    {
      label: "LinkedIn",
      filled: !!employee.linkedinUrl,
    },
  ];
  const filled = fields.filter((f) => f.filled).length;
  const missing = fields.filter((f) => !f.filled).map((f) => f.label);
  return { pct: Math.round((filled / fields.length) * 100), missing };
}

function AvailabilityBadge({ userId }: { userId: string }) {
  const { data } = useEmployeeAvailability([userId]);
  const entry = data?.find((e) => e.userId === userId);
  if (!entry) return null;

  if (entry.status === "ON_LEAVE") {
    const label = `On Leave${entry.leaveType ? ` (${entry.leaveType})` : ""}`;
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30">
        <XCircle className="h-3 w-3" />
        {label}
      </span>
    );
  }
  if (entry.status === "HALF_DAY") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30">
        <AlertCircle className="h-3 w-3" />
        Half Day
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30">
      <CheckCircle2 className="h-3 w-3" />
      Available
    </span>
  );
}

function StatBlock({
  label,
  value,
  colorClass,
}: {
  label: string;
  value: string | number;
  colorClass?: string;
}) {
  return (
    <div className="min-w-0 flex-1 text-center px-2 sm:px-4 first:pl-0 last:pr-0">
      <p
        className={cn(
          "text-2xl font-bold tabular-nums sm:text-3xl",
          colorClass ?? "text-foreground",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:text-[11px]">
        {label}
      </p>
    </div>
  );
}

function InfoField({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | null | undefined;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  if (!value) return null;
  return (
    <div className="flex min-w-0 items-start gap-2 sm:min-w-[10rem]">
      {Icon && (
        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <TruncatedText text={value} className="text-sm font-medium leading-snug" />
      </div>
    </div>
  );
}

function DirectReportsSection({ employeeId }: { employeeId: string }) {
  const { data: reports, isLoading } = useDirectReports(employeeId);

  if (isLoading) {
    return (
      <Card className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-3.5 w-3.5 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Direct Reports
            </h3>
          </div>
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  if (!reports || reports.length === 0) return null;

  return (
    <Card className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="h-3.5 w-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            Direct Reports
          </h3>
          <span className="ml-auto inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">
            {reports.length}
          </span>
        </div>
        <div className="space-y-1">
          {reports.map((r) => (
            <Link
              key={r.id}
              href={`/hr/employees/${r.id}`}
              className="flex items-center gap-2.5 hover:bg-muted/60 rounded-lg p-2 transition-colors duration-200"
            >
              <Avatar className="w-7 shrink-0">
                <AvatarImage src={resolveImageUrl(r.image)} />
                <AvatarFallback className="text-xs bg-muted text-muted-foreground font-bold">
                  {(r.name ?? "?")[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <TruncatedText
                  text={r.name ?? r.email ?? ""}
                  className="text-sm font-medium"
                />
                {r.designation && (
                  <TruncatedText
                    text={r.designation}
                    className="text-[11px] text-muted-foreground"
                  />
                )}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ManagerScorecardSection({ employeeId }: { employeeId: string }) {
  const { data: scorecard, isLoading } = useManagerScorecard(employeeId);

  if (isLoading) return <Skeleton className="h-28 w-full rounded-2xl" />;
  if (!scorecard || scorecard.teamSize === 0) return null;

  return (
    <Card className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart2 className="h-3.5 w-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            Manager Scorecard
          </h3>
        </div>
        <div className="grid grid-cols-3 divide-x divide-border">
          <StatBlock
            label="Team Size"
            value={scorecard.teamSize}
            colorClass="text-primary"
          />
          <StatBlock
            label="Avg Rating"
            value={
              scorecard.avgPerformanceRating !== null
                ? `${scorecard.avgPerformanceRating}/5`
                : "N/A"
            }
            colorClass="text-primary"
          />
          <StatBlock
            label="Attendance"
            value={
              scorecard.teamAttendanceRate !== null
                ? `${scorecard.teamAttendanceRate}%`
                : "N/A"
            }
            colorClass="text-emerald-700 dark:text-emerald-300"
          />
        </div>
        {scorecard.pendingLeaveRequests > 0 && (
          <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-300 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
              {scorecard.pendingLeaveRequests} pending leave request
              {scorecard.pendingLeaveRequests !== 1 ? "s" : ""} awaiting
              approval
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const LIFECYCLE_BADGE: Record<string, { label: string; className: string }> = {
  CANDIDATE: {
    label: "Candidate",
    className:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:border-slate-500/30",
  },
  PRE_JOINING: {
    label: "Pre-joining",
    className:
      "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30",
  },
  ONBOARDING: {
    label: "Onboarding",
    className:
      "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/30",
  },
  ACTIVE: {
    label: "Active",
    className:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  },
  PROBATION: {
    label: "Probation",
    className:
      "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  },
  CONFIRMED: {
    label: "Confirmed",
    className:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  },
  NOTICE: {
    label: "Notice",
    className:
      "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/30",
  },
  EXITED: {
    label: "Exited",
    className:
      "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30",
  },
  ALUMNI: {
    label: "Alumni",
    className:
      "bg-muted text-muted-foreground border-border",
  },
  SUSPENDED: {
    label: "Suspended",
    className:
      "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30",
  },
};

export function EmployeeDetailsView({ employee }: { employee: EmployeeData }) {
  const hydrated = useHydrated();
  const { data: stats, isLoading: statsLoading } = useHrEmployeeStats(
    employee.id,
  );
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
  const tabsListRef = useRef<HTMLDivElement>(null);

  const isSelf = hydrated && session?.user?.id === employee.id;
  const showManageActions = hydrated && canManageEmployees;
  const showSensitiveTab = hydrated && canViewSensitive;
  const employeeName =
    `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim() ||
    "Employee";

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
  }, [defaultTab, showSensitiveTab, isSelf, scrollActiveTabIntoView]);

  const skillsList: string[] = (employee.skills ?? []).map((s) => s.name);

  const { pct: completeness, missing: missingFields } =
    profileCompletenessScore(employee);

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
  const workerType =
    employmentRecord?.workerType ??
    nestedEmployment?.workerType ??
    null;
  const lifecycleBadge = lifecycleStatus
    ? LIFECYCLE_BADGE[lifecycleStatus] ?? {
        label: lifecycleStatus,
        className: "bg-muted text-muted-foreground border-border",
      }
    : null;

  const handleTerminateClick = useCallback(() => {
    router.push(`/hr/termination?employeeId=${employee.id}`);
  }, [employee.id, router]);

  const handleBack = useCallback(() => router.back(), [router]);

  const attritionRiskMutation = useAIAttritionRisk();
  const generateReviewMutation = useAIGenerateReview();

  const exportPdfMutation = useMutation({
    mutationKey: ["hr", "employees", employee.id, "profile-pdf"],
    mutationFn: async () => {
      const blob = await apiClient.download(
        `/hr/employees/${employee.id}/profile-pdf`,
      );
      const header = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
      const isPdf =
        header.length >= 5 &&
        header[0] === 0x25 &&
        header[1] === 0x50 &&
        header[2] === 0x44 &&
        header[3] === 0x46 &&
        header[4] === 0x2d; // %PDF-
      if (!isPdf) {
        throw new Error("Export did not return a valid PDF. Please try again.");
      }
      const pdfBlob =
        blob.type === "application/pdf"
          ? blob
          : new Blob([blob], { type: "application/pdf" });
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `employee-profile-${employeeName.replace(/\s+/g, "-").toLowerCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
    },
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

  // Prefer lifecycle status over a second "Active" employment badge when labels collide.
  const showEmploymentActiveBadge =
    !isAlreadyTerminated &&
    (!lifecycleBadge || lifecycleBadge.label.toUpperCase() !== "ACTIVE");

  const legacyEmployeeId =
    typeof employee.employeeId === "string" ? employee.employeeId.trim() : "";
  const showLegacyEmployeeId =
    !!legacyEmployeeId &&
    legacyEmployeeId !== (employeeNumber ?? "").trim();

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
            <span className="sr-only">{employeeName}</span>
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
        <Card
          className={cn(
            "shrink-0 overflow-hidden rounded-2xl border border-border/70 border-l-4 bg-card/90 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] backdrop-blur-sm",
            isAlreadyTerminated ? "border-l-rose-500" : "border-l-emerald-500",
          )}
        >
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
              <div className="flex items-start gap-3 sm:block sm:shrink-0">
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
                  <AvatarImage
                    src={resolveImageUrl(
                      typeof employee.image === "string"
                        ? employee.image
                        : null,
                    )}
                  />
                  <AvatarFallback className="bg-muted text-lg font-bold text-muted-foreground sm:text-xl">
                    {getInitials(employee.firstName, employee.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 sm:hidden">
                  <h2 className="text-base font-bold leading-tight text-foreground">
                    {employeeName}
                  </h2>
                  {employee.designation && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {employee.designation}
                    </p>
                  )}
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-3.5">
                <div className="hidden items-start gap-2 sm:flex">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-bold text-foreground">
                      {employeeName}
                    </h2>
                    {employee.designation && (
                      <p className="text-sm text-muted-foreground">
                        {employee.designation}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                    {lifecycleBadge && !isAlreadyTerminated && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                          lifecycleBadge.className,
                        )}
                      >
                        <Tag className="h-3 w-3" />
                        {lifecycleBadge.label}
                      </span>
                    )}
                    {employeeNumber && (
                      <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
                        {employeeNumber}
                      </span>
                    )}
                    {workerType && (
                      <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {workerType.replaceAll("_", " ")}
                      </span>
                    )}
                    {isAlreadyTerminated ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                        <XCircle className="h-3 w-3" />
                        Terminated
                      </span>
                    ) : showEmploymentActiveBadge ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                        <CheckCircle2 className="h-3 w-3" />
                        Active
                      </span>
                    ) : null}
                    {employee.role && (
                      <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {employee.role}
                      </span>
                    )}
                    {showLegacyEmployeeId && (
                        <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          ID: {legacyEmployeeId}
                        </span>
                      )}
                  <AvailabilityBadge userId={employee.id} />
                </div>

                <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:flex sm:flex-wrap sm:gap-x-5 sm:gap-y-2.5">
                  <InfoField icon={Mail} label="Email" value={employee.email} />
                  <InfoField
                    icon={Phone}
                    label="Phone"
                    value={employee.phone}
                  />
                  <InfoField
                    icon={Building2}
                    label="Department"
                    value={
                      typeof employee.departmentName === "string"
                        ? employee.departmentName
                        : null
                    }
                  />
                  <InfoField
                    icon={Calendar}
                    label="Joined"
                    value={
                      employee.joiningDate
                        ? format(
                            new Date(String(employee.joiningDate)),
                            "MMM yyyy",
                          )
                        : null
                    }
                  />
                </div>

                {typeof employee.bio === "string" && employee.bio && (
                  <TruncatedText
                    text={employee.bio}
                    lines={2}
                    className="text-sm text-muted-foreground"
                  />
                )}

                {isSelf && completeness < 100 && (
                  <div className="space-y-2 border-t border-border/60 pt-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Profile Completeness
                      </span>
                      <span className="text-[11px] font-bold tabular-nums text-foreground">
                        {completeness}%
                      </span>
                    </div>
                    <Progress value={completeness} className="h-1.5" />
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Missing: {missingFields.slice(0, 3).join(", ")}
                      {missingFields.length > 3
                        ? ` +${missingFields.length - 3} more`
                        : ""}
                    </p>
                  </div>
                )}
              </div>

              {!statsLoading && stats && (
                <div className="flex items-center divide-x divide-border rounded-xl border border-border/60 bg-muted/20 py-3 sm:shrink-0 sm:border-0 sm:border-l sm:border-border sm:bg-transparent sm:py-0 sm:pl-5 sm:rounded-none">
                  <StatBlock
                    label="Present"
                    value={stats.attendance?.daysPresent ?? 0}
                    colorClass="text-emerald-700 dark:text-emerald-300"
                  />
                  <StatBlock
                    label="Leaves"
                    value={stats.leaves.total}
                    colorClass="text-primary"
                  />
                  <StatBlock
                    label="Pending"
                    value={stats.leaves.pending}
                    colorClass="text-amber-700 dark:text-amber-300"
                  />
                </div>
              )}
              {statsLoading && (
                <div className="flex items-center divide-x divide-border rounded-xl border border-border/60 bg-muted/20 py-3 sm:shrink-0 sm:border-0 sm:border-l sm:border-border sm:bg-transparent sm:py-0 sm:pl-5 sm:rounded-none">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex-1 space-y-1.5 px-3 text-center sm:px-4">
                      <Skeleton className="mx-auto h-8 w-10 sm:h-10" />
                      <Skeleton className="mx-auto h-3 w-12" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs
          defaultValue={defaultTab}
          className="flex flex-col gap-4"
          onValueChange={() => {
            // Let Radix update data-state before scrolling.
            requestAnimationFrame(scrollActiveTabIntoView);
          }}
        >
          <ScrollEdgeFade className="shrink-0">
            <TabsList
              ref={tabsListRef}
              className="h-auto min-h-9 w-max min-w-full justify-start gap-1 overflow-visible rounded-lg border p-1"
            >
              <TabsTrigger
                value="overview"
                className="h-8 min-h-8 flex-none shrink-0 gap-1.5 rounded-md px-2.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Briefcase className="h-3 w-3" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="attendance"
                className="h-8 min-h-8 flex-none shrink-0 gap-1.5 rounded-md px-2.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Clock className="h-3 w-3" />
                Attendance
              </TabsTrigger>
              <TabsTrigger
                value="timeline"
                className="h-8 min-h-8 flex-none shrink-0 gap-1.5 rounded-md px-2.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Clock className="h-3 w-3" />
                Timeline
              </TabsTrigger>
              <TabsTrigger
                value="sensitive"
                hidden={!showSensitiveTab}
                className="h-8 min-h-8 flex-none shrink-0 gap-1.5 rounded-md px-2.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Shield className="h-3 w-3" />
                Sensitive
              </TabsTrigger>
              <TabsTrigger
                value="my-profile"
                hidden={!isSelf}
                className="h-8 min-h-8 flex-none shrink-0 gap-1.5 rounded-md px-2.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <UserCircle className="h-3 w-3" />
                My Profile
              </TabsTrigger>
              <TabsTrigger
                value="profile"
                className="h-8 min-h-8 flex-none shrink-0 gap-1.5 rounded-md px-2.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <FileCheck className="h-3 w-3" />
                Edit
              </TabsTrigger>
            </TabsList>
          </ScrollEdgeFade>

          <TabsContent
            value="overview"
            className="mt-0 flex-none"
          >
            <div className="space-y-4 pb-4">
              {skillsList.length > 0 && (
                <Card className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 rounded-lg bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center">
                        <Tag className="h-3.5 w-3.5 text-amber-600 dark:text-amber-300" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Skills &amp; Expertise
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {skillsList.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <ManagerScorecardSection employeeId={employee.id} />

              <DirectReportsSection employeeId={employee.id} />

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden">
                  <CardContent className="p-4 sm:p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                        <Briefcase className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Projects
                      </h3>
                    </div>
                    <EmployeeProjectsList
                      projects={(projects ?? []).map((p) => ({
                        id: Number(p["id"]),
                        name: String(p["name"] ?? ""),
                        role: p["role"] != null ? String(p["role"]) : null,
                        description: p["description"] != null ? String(p["description"]) : null,
                        stats: p["stats"] != null
                          ? {
                              todo: Number((p["stats"] as Record<string, unknown>)["todo"] ?? 0),
                              inProgress: Number((p["stats"] as Record<string, unknown>)["inProgress"] ?? 0),
                              done: Number((p["stats"] as Record<string, unknown>)["done"] ?? 0),
                            }
                          : undefined,
                      }))}
                    />
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden">
                  <CardContent className="p-4 sm:p-5">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                        <FileCheck className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Assigned Tickets
                      </h3>
                    </div>
                    <EmployeeTicketsList
                      tickets={
                        (ticketsResult?.data ?? []) as Parameters<
                          typeof EmployeeTicketsList
                        >[0]["tickets"]
                      }
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="attendance"
            className="mt-0 flex-none"
          >
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
            <TabsContent
              value="my-profile"
              className="mt-0 flex-none"
            >
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
                />
              </div>
            </TabsContent>
          )}

          <TabsContent
            value="profile"
            className="mt-0 flex-none pb-4"
          >
            <EditEmployeeForm employee={employee} />
          </TabsContent>
        </Tabs>
      </PageWrapper>
  );
}
