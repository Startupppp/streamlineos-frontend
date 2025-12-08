"use client";

import { api } from "@/trpc/react";
import { LeaveRequestForm } from "@/components/hr/leave-request-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

export default function LeavesPage() {
  const { data, isLoading } = api.hr.getLeaves.useQuery();

  if (isLoading) {
    return (
      <div className="p-8 space-y-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const { balances, types, requests } = data || { balances: [], types: [], requests: [] };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary">Leave Management</h1>
        <LeaveRequestForm types={types} />
      </div>

      {/* Balances */}
      <div className="grid gap-4 md:grid-cols-3">
        {balances.length > 0 ? balances.map((balance) => (
            <Card key={balance.id}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                        {/* Ideally fetching name from type relation */}
                        Leave Balance (Type {balance.leaveTypeId})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{balance.balance} days</div>
                </CardContent>
            </Card>
        )) : (
            <Card>
                 <CardContent className="pt-6">
                    <p className="text-muted-foreground">No leave balances found. Contact HR.</p>
                 </CardContent>
            </Card>
        )}
      </div>

      {/* Request History */}
      <Card>
        <CardHeader>
          <CardTitle>My Leave History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dates</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell>
                    {format(new Date(req.startDate), "MMM d")} - {format(new Date(req.endDate), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>Type {req.leaveTypeId}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{req.reason}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold
                      ${req.status === "APPROVED" ? "bg-green-100 text-green-700" : 
                        req.status === "REJECTED" ? "bg-red-100 text-red-700" : 
                        "bg-yellow-100 text-yellow-700"}`}>
                      {req.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
              {requests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                    No records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
