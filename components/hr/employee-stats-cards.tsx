
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";

interface LeaveBalance {
    id: number;
    name: string;
    remaining: number;
    total: number;
}

interface RecentLeave {
    id: number;
    startDate: string | Date;
    endDate: string | Date;
    status: string | null;
    leaveType?: { name: string } | null;
}

interface AttendanceStats {
    present: number;
    absent: number;
    late: number;
    totalDays: number;
}

interface EmployeeStats {
    leaveBalances: LeaveBalance[];
    recentLeaves: RecentLeave[];
    attendance?: AttendanceStats;
}

export function EmployeeLeaveStats({ stats }: { stats?: EmployeeStats | null }) {
    if (!stats) return <div>Loading...</div>;

    return (
        <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Leave Balances</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {stats.leaveBalances.map((leave) => (
                        <div key={leave.id} className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium">{leave.name}</span>
                                <span className="text-muted-foreground">{leave.remaining} / {leave.total} days</span>
                            </div>
                            <Progress value={(leave.remaining / leave.total) * 100} />
                        </div>
                    ))}
                    {stats.leaveBalances.length === 0 && <p className="text-sm text-muted-foreground">No leave types assigned.</p>}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-sm font-medium">Recent Leave Requests</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {stats.recentLeaves.map((req) => (
                            <div key={req.id} className="flex items-center justify-between text-sm">
                                <div>
                                    <p className="font-medium">{req.leaveType?.name || "Leave"}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {format(new Date(req.startDate), "MMM dd")} - {format(new Date(req.endDate), "MMM dd")}
                                    </p>
                                </div>
                                <Badge variant={
                                    req.status === "APPROVED" ? "default" : 
                                    req.status === "REJECTED" ? "destructive" : "secondary"
                                }>
                                    {req.status}
                                </Badge>
                            </div>
                        ))}
                         {stats.recentLeaves.length === 0 && <p className="text-sm text-muted-foreground">No recent requests.</p>}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

interface AttendanceStats {
    present: number;
    absent: number;
    late: number;
    totalDays: number;
}

export function EmployeeAttendanceSummary({ attendance }: { attendance?: AttendanceStats | null }) {
    if (!attendance) return null;

    return (
        <Card>
             <CardHeader>
                <CardTitle className="text-sm font-medium">Attendance (Current Month)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="flex flex-col items-center p-2 bg-green-50 rounded-lg">
                        <CheckCircle2 className="h-5 w-5 text-green-600 mb-1" />
                        <span className="text-2xl font-bold text-green-700">{attendance.present}</span>
                        <span className="text-xs text-green-600">Present</span>
                    </div>
                    <div className="flex flex-col items-center p-2 bg-red-50 rounded-lg">
                         <XCircle className="h-5 w-5 text-red-600 mb-1" />
                        <span className="text-2xl font-bold text-red-700">{attendance.absent}</span>
                        <span className="text-xs text-red-600">Absent</span>
                    </div>
                     <div className="flex flex-col items-center p-2 bg-yellow-50 rounded-lg">
                        <Clock className="h-5 w-5 text-yellow-600 mb-1" />
                        <span className="text-2xl font-bold text-yellow-700">{attendance.late}</span>
                        <span className="text-xs text-yellow-600">Late</span>
                    </div>
                    <div className="flex flex-col items-center p-2 bg-blue-50 rounded-lg">
                         <AlertCircle className="h-5 w-5 text-blue-600 mb-1" />
                        <span className="text-2xl font-bold text-blue-700">{attendance.totalDays}</span>
                        <span className="text-xs text-blue-600">Total</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
