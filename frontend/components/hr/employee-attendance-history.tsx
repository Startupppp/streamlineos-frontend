"use client";

import { useState } from "react";
import { useHrMonthlyAttendance } from "@/hooks/api/hr";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { AttendanceLog } from "@/types/hr/attendance";

const ATTENDANCE_COLUMNS: DataTableColumn<AttendanceLog>[] = [
  {
    key: "date",
    header: "Date",
    cell: (row) => format(new Date(row.date), "MMM d, yyyy"),
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => (
      <Badge
        variant={
          row.status === "PRESENT" || row.status === "WORK_FROM_HOME" ? "default" : "secondary"
        }
      >
        {row.status ?? "—"}
      </Badge>
    ),
  },
  {
    key: "checkIn",
    header: "Check In",
    cell: (row) => (row.checkIn ? format(new Date(row.checkIn), "hh:mm a") : "-"),
  },
  {
    key: "checkOut",
    header: "Check Out",
    cell: (row) => (row.checkOut ? format(new Date(row.checkOut), "hh:mm a") : "-"),
  },
  {
    key: "workHours",
    header: "Work Hours",
    cell: (row) => <span className="font-bold">{row.workHours ?? "0"}h</span>,
  },
];

function getRowKey(row: AttendanceLog) {
  return row.id;
}

export function EmployeeAttendanceHistory({ userId }: { userId: string }) {
  const [date, setDate] = useState(new Date());

  const { data: attendance, isLoading } = useHrMonthlyAttendance({
    userId,
    year: date.getFullYear(),
    month: date.getMonth(),
  });

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const totalHours =
    attendance?.reduce((acc, curr) => acc + parseFloat(curr.workHours || "0"), 0) || 0;

  function handleMonthChange(val: string) {
    const newDate = new Date(date);
    newDate.setMonth(parseInt(val));
    setDate(newDate);
  }

  function handleYearChange(val: string) {
    const newDate = new Date(date);
    newDate.setFullYear(parseInt(val));
    setDate(newDate);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Select value={date.getMonth().toString()} onValueChange={handleMonthChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Month" />
          </SelectTrigger>
          <SelectContent>
            {months.map((m, i) => (
              <SelectItem key={i} value={i.toString()}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={date.getFullYear().toString()} onValueChange={handleYearChange}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={y.toString()}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}h</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Days Present</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-2xl font-bold">{attendance?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Daily Attendance</CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          <DataTable
            data={attendance ?? []}
            columns={ATTENDANCE_COLUMNS}
            getRowKey={getRowKey}
            isLoading={isLoading}
            emptyState={
              <div className="text-center py-4 text-muted-foreground">
                No attendance records found for this month.
              </div>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
