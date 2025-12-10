"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Checkbox } from "../ui/checkbox";
import { Badge } from "../ui/badge";
import { useHrAttendanceStatus } from "../../lib/hooks/trpc-hooks";
import { format } from "date-fns";
import { MonthlyLogSkeleton } from "../ui/attendance-skeleton";

export function MonthlyLog() {
  const { data, isLoading } = useHrAttendanceStatus();

  if (isLoading) {
    return <MonthlyLogSkeleton />;
  }

  const logs = data?.logs || [];

  return (
    <div className="rounded-md border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="border-border hover:bg-muted/50">
            <TableHead className="w-[50px]">
              <Checkbox className="border-muted-foreground" />
            </TableHead>
            <TableHead className="text-muted-foreground">Date</TableHead>
            <TableHead className="text-muted-foreground">Status</TableHead>
            <TableHead className="text-muted-foreground">In Time</TableHead>
            <TableHead className="text-muted-foreground">Out Time</TableHead>
            <TableHead className="text-muted-foreground">Work Duration</TableHead>
            <TableHead className="text-muted-foreground">Overtime Duration</TableHead>
            <TableHead className="text-muted-foreground">Break Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 ? (
            <TableRow className="border-border hover:bg-muted/50 text-muted-foreground">
              <TableCell colSpan={8} className="text-center py-8">
                No attendance logs found for this month.
              </TableCell>
            </TableRow>
          ) : (
            logs.map((row) => (
              <TableRow
                key={row.id}
                className="border-border hover:bg-muted/50 text-foreground"
              >
                <TableCell>
                  <Checkbox className="border-muted-foreground" />
                </TableCell>
                <TableCell className="font-medium">
                  {format(new Date(row.date), "dd-MM-yyyy")}
                </TableCell>
                <TableCell>
                  {row.status === "PRESENT" ? (
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-0">
                      P
                    </Badge>
                  ) : row.status === "ABSENT" ? (
                    <Badge className="bg-red-500/10 text-red-500 border-0">
                      A
                    </Badge>
                  ) : (
                    <Badge className="bg-blue-500/10 text-blue-500 border-0">
                      {row.status}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {row.checkIn
                    ? format(new Date(row.checkIn), "hh:mm a")
                    : "--"}
                </TableCell>
                <TableCell>
                  {row.checkOut
                    ? format(new Date(row.checkOut), "hh:mm a")
                    : "--"}
                </TableCell>
                <TableCell>
                  {row.workHours ? `${row.workHours} hrs` : "--"}
                </TableCell>
                <TableCell>{row.isOvertime ? "Yes" : "--"}</TableCell>
                <TableCell>
                  {row.breakHours ? `${row.breakHours} hrs` : "--"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
