"use client";

import { useState, useCallback } from "react";
import { EditEmployeeForm, type EmployeeData } from "./edit-employee-form";
import { EmployeeAttendanceHistory } from "@/components/hr/employee-attendance-history";
import { SelfEditProfileForm } from "@/components/hr/self-edit-profile-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useHrEmployeeStats,
  useHrEmployeeProjects,
  useHrEmployeeTickets,
  useTerminateEmployee,
  useDirectReports,
  useManagerScorecard,
  useEmployeeAvailability,
} from "@/lib/api/hooks/hr";
import { EmployeeProjectsList } from "@/components/hr/employee-projects-list";
import { EmployeeTicketsList } from "@/components/hr/employee-tickets-list";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCan } from "@/lib/api/hooks/access";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { resolveImageUrl, cn } from "@/lib/utils";
import { format } from "date-fns";
import type { Employee } from "@/types/hr";
import { canDeleteEmployee } from "@/features/hr/employees/hr-types";

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
      filled: !!(employee as Record<string, unknown>).image,
    },
    { label: "Bio", filled: !!(employee as Record<string, unknown>).bio },
    {
      label: "Skills",
      filled: Array.isArray(employee.skills)
        ? employee.skills.length > 0
        : !!employee.skills,
    },
    {
      label: "LinkedIn",
      filled: !!(employee as Record<string, unknown>).linkedinUrl,
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
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800">
        <XCircle className="h-3 w-3" />
        {label}
      </span>
    );
  }
  if (entry.status === "HALF_DAY") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800">
        <AlertCircle className="h-3 w-3" />
        Half Day
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800">
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
    <div className="text-center px-4 first:pl-0 last:pr-0">
      <p
        className={cn(
          "text-3xl font-bold tabular-nums",
          colorClass ?? "text-foreground",
        )}
      >
        {value}
      </p>
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">
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
    <div className="flex items-start gap-2 min-w-0">
      {Icon && (
        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
      )}
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function DirectReportsSection({ employeeId }: { employeeId: string }) {
  const { data: reports, isLoading } = useDirectReports(employeeId);

  if (isLoading) {
    return (
      <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-7 w-7 rounded-lg bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
              <Users className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">
              Direct Reports
            </h3>
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  if (!reports || reports.length === 0) return null;

  return (
    <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-lg bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
            <Users className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            Direct Reports
          </h3>
          <span className="ml-auto inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-800">
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
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={resolveImageUrl(r.image)} />
                <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-primary/40 text-primary font-bold">
                  {(r.name ?? "?")[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {r.name ?? r.email}
                </p>
                {r.designation && (
                  <p className="text-[11px] text-muted-foreground truncate">
                    {r.designation}
                  </p>
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
    <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
            <BarChart2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            Manager Scorecard
          </h3>
        </div>
        <div className="grid grid-cols-3 divide-x divide-border">
          <StatBlock
            label="Team Size"
            value={scorecard.teamSize}
            colorClass="text-blue-700 dark:text-blue-400"
          />
          <StatBlock
            label="Avg Rating"
            value={
              scorecard.avgPerformanceRating !== null
                ? `${scorecard.avgPerformanceRating}/5`
                : "N/A"
            }
            colorClass="text-violet-700 dark:text-violet-400"
          />
          <StatBlock
            label="Attendance"
            value={
              scorecard.teamAttendanceRate !== null
                ? `${scorecard.teamAttendanceRate}%`
                : "N/A"
            }
            colorClass="text-emerald-700 dark:text-emerald-400"
          />
        </div>
        {scorecard.pendingLeaveRequests > 0 && (
          <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
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

export function EmployeeDetailsView({ employee }: { employee: EmployeeData }) {
  const { data: stats, isLoading: statsLoading } = useHrEmployeeStats(
    employee.id,
  );
  const { data: projects } = useHrEmployeeProjects(employee.id);
  const { data: ticketsResult } = useHrEmployeeTickets(employee.id);
  const terminateMutation = useTerminateEmployee();
  const router = useRouter();
  const { data: session } = useSession();
  const canManageEmployees = useCan("hr:employees:manage");
  const [terminateOpen, setTerminateOpen] = useState(false);
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") ?? "overview";

  const isSelf = session?.user?.id === employee.id;
  const employeeName =
    `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim() ||
    "Employee";

  const skillsList: string[] = Array.isArray(employee.skills)
    ? (employee.skills as string[]).filter(Boolean)
    : typeof employee.skills === "string" && employee.skills
      ? employee.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

  const { pct: completeness, missing: missingFields } =
    profileCompletenessScore(employee);

  const handleTerminateClick = useCallback(() => setTerminateOpen(true), []);
  const handleDownloadProfile = useCallback(async () => {
    try {
      const blob = await apiClient.download(
        `/hr/employees/${employee.id}/profile-pdf`,
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `employee-${employee.id}-profile.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }, [employee.id]);
  const handleTerminateConfirm = useCallback(() => {
    terminateMutation.mutate(employee.id, {
      onSuccess: () => {
        toast.success(`${employeeName} has been terminated.`);
        setTerminateOpen(false);
        router.push("/hr/employees");
      },
      onError: (err) => toast.error((err as Error).message),
    });
  }, [employee.id, employeeName, terminateMutation, router]);

  const handleBack = useCallback(() => router.back(), [router]);

  const employeeAsEmployee = employee as unknown as Employee;
  const employmentStatus =
    typeof (employee as Record<string, unknown>).employmentStatus === "string"
      ? (
          (employee as Record<string, unknown>).employmentStatus as string
        ).toUpperCase()
      : null;
  const isAlreadyTerminated =
    employee.isActive === false || employmentStatus === "TERMINATED";
  const canTerminate =
    !isAlreadyTerminated &&
    canDeleteEmployee(
      employeeAsEmployee.role ?? "",
      employee.id,
      true,
      session?.user?.role,
      session?.user?.id,
    );

  return (
    <>
      <PageWrapper
        title={employeeName}
        subtitle={employee.designation ?? employee.role ?? ""}
        actions={
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5"
              onClick={handleBack}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Button>
            {canManageEmployees && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                asChild
              >
                <a
                  href={`/api/hr/employees/${employee.id}/profile-pdf`}
                  download
                >
                  <Download className="h-3.5 w-3.5" />
                  Export PDF
                </a>
              </Button>
            )}
            {canTerminate && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                onClick={handleTerminateClick}
                disabled={terminateMutation.isPending}
              >
                <UserX className="h-3.5 w-3.5" />
                Terminate
              </Button>
            )}
          </div>
        }
        noInternalScroll
        contentClassName="flex flex-col gap-3"
      >
        <Card
          className={cn(
            "rounded-2xl border border-border bg-card shadow-sm overflow-hidden shrink-0 border-l-4",
            isAlreadyTerminated ? "border-l-rose-500" : "border-l-emerald-500",
          )}
        >
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row gap-5">
              <div className="shrink-0">
                <Avatar className="h-20 w-20">
                  <AvatarImage
                    src={resolveImageUrl(
                      typeof employee.image === "string"
                        ? employee.image
                        : null,
                    )}
                  />
                  <AvatarFallback className="text-xl bg-gradient-to-br from-primary/20 to-primary/50 text-primary font-bold">
                    {getInitials(employee.firstName, employee.lastName)}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex items-start gap-2 flex-wrap">
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
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {isAlreadyTerminated ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800">
                        <XCircle className="h-3 w-3" />
                        Terminated
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800">
                        <CheckCircle2 className="h-3 w-3" />
                        Active
                      </span>
                    )}
                    {employee.role && (
                      <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-800">
                        {employee.role}
                      </span>
                    )}
                    {typeof employee.employeeId === "string" &&
                      employee.employeeId && (
                        <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border border-border bg-muted text-muted-foreground">
                          ID: {employee.employeeId}
                        </span>
                      )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-2.5">
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

                <div className="flex items-center gap-2 flex-wrap">
                  <AvailabilityBadge userId={employee.id} />
                </div>

                {(employeeAsEmployee as Employee).bio && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {(employeeAsEmployee as Employee).bio}
                  </p>
                )}

                {isSelf && completeness < 100 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Profile Completeness
                      </span>
                      <span className="text-[11px] font-bold text-foreground">
                        {completeness}%
                      </span>
                    </div>
                    <Progress value={completeness} className="h-1.5" />
                    <p className="text-[11px] text-muted-foreground">
                      Missing: {missingFields.slice(0, 3).join(", ")}
                      {missingFields.length > 3
                        ? ` +${missingFields.length - 3} more`
                        : ""}
                    </p>
                  </div>
                )}
              </div>

              {!statsLoading && stats && (
                <div className="flex items-center shrink-0 border-l border-border pl-5 divide-x divide-border">
                  <StatBlock
                    label="Present"
                    value={stats.attendance?.daysPresent ?? 0}
                    colorClass="text-emerald-700 dark:text-emerald-400"
                  />
                  <StatBlock
                    label="Leaves"
                    value={stats.leaves.total}
                    colorClass="text-blue-700 dark:text-blue-400"
                  />
                  <StatBlock
                    label="Pending"
                    value={stats.leaves.pending}
                    colorClass="text-amber-700 dark:text-amber-400"
                  />
                </div>
              )}
              {statsLoading && (
                <div className="flex items-center shrink-0 border-l border-border pl-5 divide-x divide-border">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="text-center px-4 space-y-1.5">
                      <Skeleton className="h-8 w-10 mx-auto" />
                      <Skeleton className="h-3 w-14" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs
          defaultValue={defaultTab}
          className="flex flex-col flex-1 min-h-0"
        >
          <TabsList className="h-9 shrink-0 rounded-lg border p-1">
            <TabsTrigger
              value="overview"
              className="text-xs gap-1.5 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Briefcase className="h-3 w-3" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="attendance"
              className="text-xs gap-1.5 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <Clock className="h-3 w-3" />
              Attendance
            </TabsTrigger>
            {isSelf && (
              <TabsTrigger
                value="my-profile"
                className="text-xs gap-1.5 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <UserCircle className="h-3 w-3" />
                My Profile
              </TabsTrigger>
            )}
            <TabsTrigger
              value="profile"
              className="text-xs gap-1.5 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <FileCheck className="h-3 w-3" />
              Edit
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="overview"
            className="flex-1 min-h-0 overflow-y-auto mt-3"
          >
            <div className="space-y-3 pb-4">
              {skillsList.length > 0 && (
                <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
                        <Tag className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Skills &amp; Expertise
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {skillsList.map((skill) => (
                        <span
                          key={skill}
                          className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-800"
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

              <div className="grid gap-3 lg:grid-cols-2">
                <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center">
                        <Briefcase className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground">
                        Projects
                      </h3>
                    </div>
                    <EmployeeProjectsList
                      projects={
                        (projects ?? []) as unknown as Parameters<
                          typeof EmployeeProjectsList
                        >[0]["projects"]
                      }
                    />
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-7 w-7 rounded-lg bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center">
                        <FileCheck className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
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
            className="flex-1 min-h-0 overflow-y-auto mt-3"
          >
            <div className="pb-6">
              <EmployeeAttendanceHistory userId={employee.id} />
            </div>
          </TabsContent>

          {isSelf && (
            <TabsContent
              value="my-profile"
              className="flex-1 min-h-0 overflow-y-auto mt-3"
            >
              <div className="pb-4">
                <SelfEditProfileForm
                  employee={employeeAsEmployee}
                  onSaved={() => router.refresh()}
                />
              </div>
            </TabsContent>
          )}

          <TabsContent
            value="profile"
            className="flex-1 min-h-0 flex flex-col mt-3"
          >
            <EditEmployeeForm employee={employee} />
          </TabsContent>
        </Tabs>
      </PageWrapper>

      <ConfirmDialog
        open={terminateOpen}
        onOpenChange={setTerminateOpen}
        title="Terminate Employee"
        description={`Are you sure you want to terminate ${employeeName}? They will lose access immediately.`}
        confirmLabel="Terminate"
        destructive
        onConfirm={handleTerminateConfirm}
      />
    </>
  );
}
