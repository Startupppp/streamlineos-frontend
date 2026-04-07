"use client";

import { useState, useCallback } from "react";
import { EditEmployeeForm, type EmployeeData } from "./edit-employee-form";
import { EmployeeAttendanceHistory } from "@/components/hr/employee-attendance-history";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useHrEmployeeStats,
  useHrEmployeeProjects,
  useHrEmployeeTickets,
  useTerminateEmployee,
} from "@/lib/api/hooks/hr";
import { EmployeeProjectsList } from "@/components/hr/employee-projects-list";
import { EmployeeTicketsList } from "@/components/hr/employee-tickets-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, UserX, Mail, Phone, Building2, Calendar, Briefcase, Clock, FileCheck, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { resolveImageUrl } from "@/lib/utils";
import { format } from "date-fns";

function getInitials(first?: string | null, last?: string | null) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

function InfoItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null | undefined }) {
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

export function EmployeeDetailsView({ employee }: { employee: EmployeeData }) {
  const { data: stats, isLoading: statsLoading } = useHrEmployeeStats(employee.id);
  const { data: projects } = useHrEmployeeProjects(employee.id);
  const { data: ticketsResult } = useHrEmployeeTickets(employee.id);
  const terminateMutation = useTerminateEmployee();
  const router = useRouter();
  const [terminateOpen, setTerminateOpen] = useState(false);
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") ?? "overview";

  const employeeName = `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim() || "Employee";

  const handleTerminateClick = useCallback(() => setTerminateOpen(true), []);
  const handleTerminateConfirm = useCallback(() => {
    terminateMutation.mutate(employee.id, {
      onSuccess: () => {
        toast.success(`${employeeName} has been terminated.`);
        setTerminateOpen(false);
        router.push("/hr");
      },
      onError: (err) => toast.error((err as Error).message),
    });
  }, [employee.id, employeeName, terminateMutation, router]);

  return (
    <>
      <PageWrapper
        title={employeeName}
        subtitle={employee.designation ?? employee.role ?? ""}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/hr"><ArrowLeft className="mr-1 h-3.5 w-3.5" />Back</Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
              onClick={handleTerminateClick}
              disabled={terminateMutation.isPending}
            >
              <UserX className="h-3.5 w-3.5 mr-1" />
              Terminate
            </Button>
          </div>
        }
      noInternalScroll
      >
        <div className="flex flex-col h-full gap-3">
          <Card className="shrink-0">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Avatar className="h-16 w-16 shrink-0">
                  <AvatarImage src={resolveImageUrl(typeof employee.image === "string" ? employee.image : null)} />
                  <AvatarFallback className="text-lg bg-primary/10 text-primary font-bold">
                    {getInitials(employee.firstName, employee.lastName)}
                  </AvatarFallback>
                </Avatar>

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
              <TabsTrigger value="profile" className="text-xs gap-1.5">
                <FileCheck className="h-3 w-3" />Edit
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-3 flex-1 min-h-0 overflow-y-auto space-y-3 pb-4">
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
            </TabsContent>

            <TabsContent value="attendance" className="mt-3 flex-1 min-h-0 overflow-y-auto pb-6">
              <EmployeeAttendanceHistory userId={employee.id} />
            </TabsContent>

            <TabsContent value="profile" className="mt-3 flex-1 min-h-0 flex flex-col">
              <EditEmployeeForm employee={employee} />
            </TabsContent>
          </Tabs>
        </div>
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
