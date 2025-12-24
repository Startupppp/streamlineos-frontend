"use client";

import { EditEmployeeForm } from "./edit-employee-form";
import { EmployeeAttendanceHistory } from "@/components/hr/employee-attendance-history";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function EmployeeDetailsView({ employee }: { employee: any }) {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Employee Details</h2>
            </div>
            
            <Tabs defaultValue="details" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="details">Profile Details</TabsTrigger>
                    <TabsTrigger value="attendance">Attendance History</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="space-y-4">
                    <EditEmployeeForm employee={employee} />
                </TabsContent>
                <TabsContent value="attendance" className="space-y-4">
                    <EmployeeAttendanceHistory userId={employee.id} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
