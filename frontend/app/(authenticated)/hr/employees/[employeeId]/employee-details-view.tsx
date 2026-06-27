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
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useAbility } from "@/lib/abilities-context";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { getErrorMessage } from "@/lib/get-error-message";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { resolveImageUrl } from "@/lib/utils";
import { format } from "date-fns";
import type { Employee } from "@/types/hr";
import { canDeleteEmployee } from "@/features/hr/employees/hr-types";

function getInitials(first?: string | null, last?: string | null) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

function InfoItem({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium truncate">{value}</span>
    </div>
  );
}

function StatBlock({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="text-center">
      <p className={`text-lg font-bold tabular-nums ${color ?? ""}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
    </div>
  );
}


function AvailabilityDot({ userId }: { userId: string }) {
  const { data } = useEmployeeAvailability([userId]);
  const entry = data?.find((e) => e.userId === userId);
  if (!entry) return null;

  const dotClass =
    entry.status === "ON_LEAVE"
      ? "bg-red-500"
      : entry.status === "HALF_DAY"
        ? "bg-amber-400"
        : "bg-green-500";

  const label =
    entry.status === "ON_LEAVE"
      ? `On Leave${entry.leaveType ? ` (${entry.leaveType})` : ""}`
      : entry.status === "HALF_DAY"
        ? "Half Day"
        : "Available";

  return (
    <span
      className="flex items-center gap-1"
      title={label}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${dotClass} shrink-0`} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </span>
  );
}


function profileCompletenessScore(employee: EmployeeData): { pct: number; missing: string[] } {
  const fields: Array<{ label: string; filled: boolean }> = [
    { label: "First name", filled: !!employee.firstName },
    { label: "Last name", filled: !!employee.lastName },
    { label: "Phone", filled: !!employee.phone },
    { label: "Designation", filled: !!employee.designation },
    { label: "Profile photo", filled: !!(employee as Record<string, unknown>).image },
    { label: "Bio", filled: !!(employee as Record<string, unknown>).bio },
    { label: "Skills", filled: Array.isArray(employee.skills) ? employee.skills.length > 0 : !!employee.skills },
    { label: "LinkedIn", filled: !!(employee as Record<string, unknown>).linkedinUrl },
  ];
  const filled = fields.filter((f) => f.filled).length;
  const missing = fields.filter((f) => !f.filled).map((f) => f.label);
  return { pct: Math.round((filled / fields.length) * 100), missing };
}


function DirectReportsSection({ employeeId }: { employeeId: string }) {
  const { data: reports, isLoading } = useDirectReports(employeeId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Who Reports to Me</h3>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  if (!reports || reports.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Who Reports to Me ({reports.length})
          </h3>
        </div>
        <div className="space-y-2">
          {reports.map((r) => (
            <Link
              key={r.id}
              href={`/hr/employees/${r.id}`}
              className="flex items-center gap-2 hover:bg-muted/60 rounded-lg p-1.5 transition-colors"
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage src={resolveImageUrl(r.image)} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                  {(r.name ?? "?")[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{r.name ?? r.email}</p>
                {r.designation && <p className="text-[11px] text-muted-foreground truncate">{r.designation}</p>}
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

  if (isLoading) return <Skeleton className="h-24 w-full rounded-lg" />;
  if (!scorecard || scorecard.teamSize === 0) return null;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <BarChart2 className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Manager Scorecard</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <StatBlock
            label="Team Size"
            value={scorecard.teamSize}
          />
          <StatBlock
            label="Avg Rating"
            value={scorecard.avgPerformanceRating !== null ? `${scorecard.avgPerformanceRating}/5` : "N/A"}
          />
          <StatBlock
            label="Attendance"
            value={scorecard.teamAttendanceRate !== null ? `${scorecard.teamAttendanceRate}%` : "N/A"}
          />
        </div>
        {scorecard.pendingLeaveRequests > 0 && (
          <p className="text-xs text-amber-600 mt-2">
            {scorecard.pendingLeaveRequests} pending leave request{scorecard.pendingLeaveRequests !== 1 ? "s" : ""} awaiting approval
          </p>
        )}
      </CardContent>
    </Card>
  );
}


export function EmployeeDetailsView({ employee }: { employee: EmployeeData }) {
  const { data: stats, isLoading: statsLoading } = useHrEmployeeStats(employee.id);
  const { data: projects } = useHrEmployeeProjects(employee.id);
  const { data: ticketsResult } = useHrEmployeeTickets(employee.id);
  const terminateMutation = useTerminateEmployee();
  const router = useRouter();
  const { data: session } = useSession();
  const ability = useAbility();
  const [terminateOpen, setTerminateOpen] = useState(false);
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") ?? "overview";

  const isSelf = session?.user?.id === employee.id;
  const employeeName = `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim() || "Employee";

  const skillsList: string[] = Array.isArray(employee.skills)
    ? (employee.skills as string[]).filter(Boolean)
    : typeof employee.skills === "string" && employee.skills
      ? employee.skills.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

  const { pct: completeness, missing: missingFields } = profileCompletenessScore(employee);

  const handleTerminateClick = useCallback(() => setTerminateOpen(true), []);
  const handleDownloadProfile = useCallback(async () => {
    try {
      const blob = await apiClient.download(`/hr/employees/${employee.id}/profile-pdf`);
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

  const employeeAsEmployee = employee as unknown as Employee;
  const employmentStatus = typeof (employee as Record<string, unknown>).employmentStatus === "string"
    ? ((employee as Record<string, unknown>).employmentStatus as string).toUpperCase()
    : null;
  const isAlreadyTerminated =
    employee.isActive === false ||
    employmentStatus === "TERMINATED";
  const canTerminate = !isAlreadyTerminated && canDeleteEmployee(
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
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />Back
            </Button>
            {ability.can("manage", "hr:employees") && (
              <Button variant="outline" size="sm" onClick={handleDownloadProfile}>
                <Download className="h-3.5 w-3.5 mr-1" />
                Download Profile
              </Button>
            )}
            {canTerminate && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                onClick={handleTerminateClick}
                disabled={terminateMutation.isPending}
                title="Terminate employee"
              >
                <UserX className="h-3.5 w-3.5 mr-1" />
                Terminate
              </Button>
            )}
          </div>
        }
        noInternalScroll
        contentClassName="flex flex-col gap-3"
      >
        <Card className="shrink-0">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16 shrink-0">
                  <AvatarImage src={resolveImageUrl(typeof employee.image === "string" ? employee.image : null)} />
                  <AvatarFallback className="text-lg bg-primary/10 text-primary font-bold">
                    {getInitials(employee.firstName, employee.lastName)}
                  </AvatarFallback>
                </Avatar>
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-semibold">{employeeName}</h2>
                  {employee.role && <Badge variant="secondary" className="text-[10px]">{employee.role}</Badge>}
                  {typeof employee.employeeId === "string" && employee.employeeId && <Badge variant="outline" className="text-[10px]">ID: {employee.employeeId}</Badge>}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <InfoItem icon={Mail} label="Email" value={employee.email} />
                  <InfoItem icon={Phone} label="Phone" value={employee.phone} />
                  <InfoItem icon={Building2} label="Dept" value={typeof employee.departmentName === "string" ? employee.departmentName : null} />
                  <InfoItem icon={Calendar} label="Joined" value={employee.joiningDate ? format(new Date(String(employee.joiningDate)), "MMM yyyy") : null} />
                </div>

                <AvailabilityDot userId={employee.id} />

                {(employeeAsEmployee as Employee).bio && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{(employeeAsEmployee as Employee).bio}</p>
                )}

                {isSelf && completeness < 100 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Profile completeness</span>
                      <span className="font-medium">{completeness}%</span>
                    </div>
                    <Progress value={completeness} className="h-1.5" />
                    <p className="text-[11px] text-muted-foreground">
                      Missing: {missingFields.slice(0, 3).join(", ")}{missingFields.length > 3 ? ` +${missingFields.length - 3} more` : ""}
                    </p>
                  </div>
                )}
              </div>

              {!statsLoading && stats && (
                <div className="flex items-center gap-4 sm:gap-6 shrink-0 border-l pl-4 sm:pl-6">
                  <StatBlock label="Present" value={stats.attendance?.daysPresent ?? 0} />
                  <StatBlock label="Leaves" value={stats.leaves.total} />
                  <StatBlock label="Pending" value={stats.leaves.pending} color="text-amber-500" />
                </div>
              )}
              {statsLoading && (
                <div className="flex gap-4 shrink-0 border-l pl-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="text-center space-y-1">
                      <Skeleton className="h-6 w-8 mx-auto" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue={defaultTab} className="flex flex-col flex-1 min-h-0">
          <TabsList className="h-9 shrink-0">
            <TabsTrigger value="overview" className="text-xs gap-1.5">
              <Briefcase className="h-3 w-3" />Overview
            </TabsTrigger>
            <TabsTrigger value="attendance" className="text-xs gap-1.5">
              <Clock className="h-3 w-3" />Attendance
            </TabsTrigger>
            {isSelf && (
              <TabsTrigger value="my-profile" className="text-xs gap-1.5">
                <UserCircle className="h-3 w-3" />My Profile
              </TabsTrigger>
            )}
            <TabsTrigger value="profile" className="text-xs gap-1.5">
              <FileCheck className="h-3 w-3" />Edit
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="flex-1 min-h-0 overflow-y-auto">
            <div className="space-y-3 pb-4">
              {skillsList.length > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-1.5 mb-3">
                      <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Skills &amp; Expertise</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {skillsList.map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <ManagerScorecardSection employeeId={employee.id} />

              <DirectReportsSection employeeId={employee.id} />

              <div className="grid gap-3 lg:grid-cols-2">
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Projects</h3>
                    <EmployeeProjectsList
                      projects={(projects ?? []) as unknown as Parameters<typeof EmployeeProjectsList>[0]["projects"]}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Assigned Tickets</h3>
                    <EmployeeTicketsList
                      tickets={(ticketsResult?.data ?? []) as Parameters<typeof EmployeeTicketsList>[0]["tickets"]}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="attendance" className="flex-1 min-h-0 overflow-y-auto">
            <div className="pb-6">
              <EmployeeAttendanceHistory userId={employee.id} />
            </div>
          </TabsContent>

          {isSelf && (
            <TabsContent value="my-profile" className="flex-1 min-h-0 overflow-y-auto">
              <div className="pb-4">
                <SelfEditProfileForm
                  employee={employeeAsEmployee}
                  onSaved={() => router.refresh()}
                />
              </div>
            </TabsContent>
          )}

          <TabsContent value="profile" className="flex-1 min-h-0 flex flex-col">
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
