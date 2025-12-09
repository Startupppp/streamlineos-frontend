"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useHrAttendanceStatus } from "@/lib/hooks/trpc-hooks";
import { format } from "date-fns";
import { MonthlyLogSkeleton } from "@/components/ui/attendance-skeleton";

export function MonthlyLog() {
  const { data, isLoading } = useHrAttendanceStatus();

  if (isLoading) {
      return <MonthlyLogSkeleton />;
  }

  const logs = data?.logs || [];

  return (
    <div className="rounded-md border border-white/10 bg-white/5">
      <Table>
        <TableHeader className="bg-white/5">
          <TableRow className="border-white/10 hover:bg-white/5">
            <TableHead className="w-[50px]">
              <Checkbox className="border-white/50" />
            </TableHead>
            <TableHead className="text-zinc-300">Date</TableHead>
            <TableHead className="text-zinc-300">Status</TableHead>
            <TableHead className="text-zinc-300">In Time</TableHead>
            <TableHead className="text-zinc-300">Out Time</TableHead>
            <TableHead className="text-zinc-300">Work Duration</TableHead>
            <TableHead className="text-zinc-300">Overtime Duration</TableHead>
            <TableHead className="text-zinc-300">Break Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.length === 0 ? (
              <TableRow className="border-white/10 hover:bg-white/5 text-zinc-400">
                  <TableCell colSpan={8} className="text-center py-8">No attendance logs found for this month.</TableCell>
              </TableRow>
          ) : (
            logs.map((row) => (
                <TableRow key={row.id} className="border-white/10 hover:bg-white/5 text-zinc-300">
                <TableCell>
                    <Checkbox className="border-white/50" />
                </TableCell>
                <TableCell className="font-medium">{format(new Date(row.date), "dd-MM-yyyy")}</TableCell>
                <TableCell>
                    {row.status === "PRESENT" ? (
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-0">P</Badge>
                    ) : row.status === "ABSENT" ? (
                    <Badge className="bg-red-500/10 text-red-500 border-0">A</Badge>
                    ) : (
                    <Badge className="bg-blue-500/10 text-blue-500 border-0">{row.status}</Badge>
                    )}
                </TableCell>
                <TableCell>{row.checkIn ? format(new Date(row.checkIn), "hh:mm a") : "--"}</TableCell>
                <TableCell>{row.checkOut ? format(new Date(row.checkOut), "hh:mm a") : "--"}</TableCell>
                <TableCell>{row.workHours ? `${row.workHours} hrs` : "--"}</TableCell>
                <TableCell>{row.isOvertime ? "Yes" : "--"}</TableCell>
                <TableCell>{row.breakHours ? `${row.breakHours} hrs` : "--"}</TableCell>
                </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
