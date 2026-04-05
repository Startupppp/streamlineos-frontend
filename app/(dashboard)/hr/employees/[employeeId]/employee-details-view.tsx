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
import {
  EmployeeLeaveStats,
  EmployeeAttendanceSummary,
} from "@/components/hr/employee-stats-cards";
import { EmployeeProjectsList } from "@/components/hr/employee-projects-list";
import { EmployeeTicketsList } from "@/components/hr/employee-tickets-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, UserX } from "lucide-react";
import Link from "next/link";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

function getInitials(first?: string | null, last?: string | null) {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

export function EmployeeDetailsView({ employee }: { employee: EmployeeData }) {
  const { data: stats } = useHrEmployeeStats(employee.id);
  const { data: projects } = useHrEmployeeProjects(employee.id);
  const { data: ticketsResult } = useHrEmployeeTickets(employee.id);
  const terminateMutation = useTerminateEmployee();
  const router = useRouter();

  const [terminateOpen, setTerminateOpen] = useState(false);

  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") ?? "overview";

  const employeeName =
    `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || "Employee";

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
        subtitle={employee.email}
        actions={
          <div className="flex items-center gap-2">
            {employee.role && (
              <Badge variant="secondary" className="text-xs">
                {employee.role}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
              onClick={handleTerminateClick}
              disabled={terminateMutation.isPending}
              aria-label="Terminate employee"
            >
              <UserX className="h-3.5 w-3.5 mr-1.5" />
              Terminate
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Back to employees" asChild>
              <Link href="/hr">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        }
        badge={
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs bg-gold/15 text-gold font-semibold">
              {getInitials(employee.firstName, employee.lastName)}
            </AvatarFallback>
          </Avatar>
        }
      >
        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList className="h-9">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="projects" className="text-xs">Projects</TabsTrigger>
            <TabsTrigger value="tickets" className="text-xs">Tickets</TabsTrigger>
            <TabsTrigger value="attendance" className="text-xs">Attendance</TabsTrigger>
            <TabsTrigger value="profile" className="text-xs">Edit Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-0">
            <EmployeeAttendanceSummary attendance={stats?.attendance} />
            <div className="grid gap-4 lg:grid-cols-2">
              <EmployeeLeaveStats stats={stats} />
              <EmployeeProjectsList
                projects={
                  (projects ?? []) as unknown as Parameters<
                    typeof EmployeeProjectsList
                  >[0]["projects"]
                }
              />
            </div>
          </TabsContent>

          <TabsContent value="projects" className="mt-0">
            <EmployeeProjectsList
              projects={
                (projects ?? []) as unknown as Parameters<
                  typeof EmployeeProjectsList
                >[0]["projects"]
              }
            />
          </TabsContent>

          <TabsContent value="tickets" className="mt-0">
            <EmployeeTicketsList
              tickets={
                (ticketsResult?.data ?? []) as Parameters<
                  typeof EmployeeTicketsList
                >[0]["tickets"]
              }
            />
          </TabsContent>

          <TabsContent value="attendance" className="space-y-4 mt-0">
            <EmployeeLeaveStats stats={stats} />
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">
                Attendance History
              </h3>
              <EmployeeAttendanceHistory userId={employee.id} />
            </div>
          </TabsContent>

          <TabsContent value="profile" className="mt-0">
            <EditEmployeeForm employee={employee} />
          </TabsContent>
        </Tabs>
      </PageWrapper>

      <ConfirmDialog
        open={terminateOpen}
        onOpenChange={setTerminateOpen}
        title="Terminate Employee"
        description={`Are you sure you want to terminate ${employeeName}? They will immediately lose access to the system. Their records will be preserved.`}
        confirmLabel="Terminate"
        destructive
        onConfirm={handleTerminateConfirm}
      />
    </>
  );
}
