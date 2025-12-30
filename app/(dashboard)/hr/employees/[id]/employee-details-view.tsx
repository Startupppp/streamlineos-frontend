"use client";

import { EditEmployeeForm, type EmployeeData } from "./edit-employee-form";
import { EmployeeAttendanceHistory } from "@/components/hr/employee-attendance-history";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/trpc/react";
import { EmployeeLeaveStats, EmployeeAttendanceSummary } from "@/components/hr/employee-stats-cards";
import { EmployeeProjectsList } from "@/components/hr/employee-projects-list";
import { EmployeeTicketsList } from "@/components/hr/employee-tickets-list";
import { PageHeader } from "@/components/ui/page-header";

export function EmployeeDetailsView({ employee }: { employee: EmployeeData }) {
    const { data: stats } = api.hr.getEmployeeStats.useQuery({ userId: employee.id });
    const { data: projects } = api.project.getEmployeeProjects.useQuery({ userId: employee.id });
    const { data: tickets } = api.project.getEmployeeTickets.useQuery({ userId: employee.id });

    const employeeName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Employee';

    return (
        <div className="space-y-6">
            <PageHeader
                title="Employee 360° View"
                description={`Complete overview for ${employeeName}`}
            />
            
            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
                    <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
                    <TabsTrigger value="projects" className="text-xs sm:text-sm">Projects</TabsTrigger>
                    <TabsTrigger value="tickets" className="text-xs sm:text-sm">Tickets</TabsTrigger>
                    <TabsTrigger value="attendance" className="text-xs sm:text-sm whitespace-nowrap">History & Attendance</TabsTrigger>
                    <TabsTrigger value="profile" className="text-xs sm:text-sm whitespace-nowrap">Profile Details</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    {/* Attendance Summary */}
                    <EmployeeAttendanceSummary attendance={stats?.attendance} />

                    {/* Stats Row - stacked on mobile, side by side on larger screens */}
                    <div className="grid gap-6 lg:grid-cols-2">
                        <EmployeeLeaveStats stats={stats} />
                        <EmployeeProjectsList projects={projects || []} />
                    </div>
                </TabsContent>

                <TabsContent value="projects" className="space-y-4">
                     <EmployeeProjectsList projects={projects || []} />
                </TabsContent>

                <TabsContent value="tickets" className="space-y-4">
                     <EmployeeTicketsList tickets={tickets || []} />
                </TabsContent>

                <TabsContent value="attendance" className="space-y-6">
                     <EmployeeLeaveStats stats={stats} />
                     <div>
                        <h3 className="text-lg font-semibold text-foreground mb-4">Attendance History</h3>
                        <EmployeeAttendanceHistory userId={employee.id} />
                     </div>
                </TabsContent>

                <TabsContent value="profile" className="space-y-4">
                    <EditEmployeeForm employee={employee} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

