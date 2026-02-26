"use client";

import { EditEmployeeForm, type EmployeeData } from "./edit-employee-form";
import { EmployeeAttendanceHistory } from "@/components/hr/employee-attendance-history";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/trpc/react";
import { EmployeeLeaveStats, EmployeeAttendanceSummary } from "@/components/hr/employee-stats-cards";
import { EmployeeProjectsList } from "@/components/hr/employee-projects-list";
import { EmployeeTicketsList } from "@/components/hr/employee-tickets-list";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function EmployeeDetailsView({ employee }: { employee: EmployeeData }) {
    const { data: stats } = api.hr.getEmployeeStats.useQuery({ userId: employee.id });
    const { data: projects } = api.project.getEmployeeProjects.useQuery({ userId: employee.id });
    const { data: tickets } = api.project.getEmployeeTickets.useQuery({ userId: employee.id });

    const employeeName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Employee';

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/hr" aria-label="Back to employees">
                    <Button variant="outline" size="icon" className="h-9 w-9" tabIndex={-1}>
                        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    </Button>
                </Link>
                <div className="flex items-center gap-3 flex-1">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">{employeeName}</h2>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{employee.email}</span>
                            {employee.role && <Badge variant="secondary" className="text-xs">{employee.role}</Badge>}
                        </div>
                    </div>
                </div>
            </div>
            
            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
                    <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
                    <TabsTrigger value="projects" className="text-xs sm:text-sm">Projects</TabsTrigger>
                    <TabsTrigger value="tickets" className="text-xs sm:text-sm">Tickets</TabsTrigger>
                    <TabsTrigger value="attendance" className="text-xs sm:text-sm whitespace-nowrap">History & Attendance</TabsTrigger>
                    <TabsTrigger value="profile" className="text-xs sm:text-sm whitespace-nowrap">Profile Details</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    
                    <EmployeeAttendanceSummary attendance={stats?.attendance} />

                    
                    <div className="grid gap-6 lg:grid-cols-2">
                        <EmployeeLeaveStats stats={stats} />
                        <EmployeeProjectsList projects={projects || []} />
                    </div>
                </TabsContent>

                <TabsContent value="projects" className="space-y-4">
                     <EmployeeProjectsList projects={projects || []} />
                </TabsContent>

                <TabsContent value="tickets" className="space-y-4">
                     <EmployeeTicketsList tickets={tickets?.data || []} />
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

