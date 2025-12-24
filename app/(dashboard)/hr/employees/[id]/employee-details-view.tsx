"use client";

import { EditEmployeeForm, type EmployeeData } from "./edit-employee-form";
import { EmployeeAttendanceHistory } from "@/components/hr/employee-attendance-history";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/trpc/react";
import { EmployeeLeaveStats, EmployeeAttendanceSummary } from "@/components/hr/employee-stats-cards";
import { EmployeeProjectsList } from "@/components/hr/employee-projects-list";

export function EmployeeDetailsView({ employee }: { employee: EmployeeData }) {
    const { data: stats } = api.hr.getEmployeeStats.useQuery({ userId: employee.id });
    const { data: projects } = api.project.getEmployeeProjects.useQuery({ userId: employee.id });

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Employee 360° View</h2>
            </div>
            
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="projects">Projects</TabsTrigger>
                    <TabsTrigger value="attendance">Attendance & Leaves</TabsTrigger>
                    <TabsTrigger value="profile">Profile Details</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    {/* Attendance Summary */}
                    <div className="grid gap-4">
                         <EmployeeAttendanceSummary attendance={stats?.attendance} />
                    </div>

                    {/* Stats Row */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <div className="col-span-4">
                            <EmployeeLeaveStats stats={stats} />
                        </div>
                        <div className="col-span-3">
                             {/* Minified Project List or just Stats? Reuse Project List for now */}
                             <EmployeeProjectsList projects={projects || []} />
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="projects" className="space-y-4">
                     <EmployeeProjectsList projects={projects || []} />
                </TabsContent>

                <TabsContent value="attendance" className="space-y-4">
                     <EmployeeLeaveStats stats={stats} />
                     <div className="mt-6">
                        <h3 className="text-lg font-medium mb-4">Attendance History</h3>
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
