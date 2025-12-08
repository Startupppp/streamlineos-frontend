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

const mockAttendanceData = [
  { id: 1, date: "07-12-2025", status: "WO", inTime: "--", outTime: "--", workDuration: "--", overtime: "--", breakDuration: "--" },
  { id: 2, date: "06-12-2025", status: "WO", inTime: "--", outTime: "--", workDuration: "--", overtime: "--", breakDuration: "--" },
  { id: 3, date: "05-12-2025", status: "A", inTime: "--", outTime: "--", workDuration: "--", overtime: "--", breakDuration: "--" },
  { id: 4, date: "04-12-2025", status: "A", inTime: "--", outTime: "--", workDuration: "--", overtime: "--", breakDuration: "--" },
  { id: 5, date: "03-12-2025", status: "P", inTime: "11:38 AM", outTime: "11:38 AM", workDuration: "00:00", overtime: "--", breakDuration: "--" },
  { id: 6, date: "02-12-2025", status: "A", inTime: "--", outTime: "--", workDuration: "--", overtime: "--", breakDuration: "--" },
  { id: 7, date: "01-12-2025", status: "P / HL", inTime: "10:52 AM", outTime: "10:52 AM", workDuration: "00:00", overtime: "--", breakDuration: "--" },
];

export function MonthlyLog() {
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
          {mockAttendanceData.map((row) => (
            <TableRow key={row.id} className="border-white/10 hover:bg-white/5 text-zinc-300">
              <TableCell>
                <Checkbox className="border-white/50" />
              </TableCell>
              <TableCell className="font-medium">{row.date}</TableCell>
              <TableCell>
                {row.status === "P" || row.status.includes("P /") ? (
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-0">{row.status}</Badge>
                ) : row.status === "WO" ? (
                  <Badge className="bg-blue-500/10 text-blue-500 border-0">{row.status}</Badge>
                ) : (
                  <Badge className="bg-red-500/10 text-red-500 border-0">{row.status}</Badge>
                )}
              </TableCell>
              <TableCell>{row.inTime}</TableCell>
              <TableCell>{row.outTime}</TableCell>
              <TableCell>{row.workDuration}</TableCell>
              <TableCell>{row.overtime}</TableCell>
              <TableCell>{row.breakDuration}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
