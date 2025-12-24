"use client";

import { api } from "@/trpc/react";
import { format } from "date-fns";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogTimeDialog } from "@/components/timesheets/log-time-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function TimesheetsPage() {
  const { data: entries, isLoading } = api.project.getTimeEntries.useQuery({});

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Timesheets</h2>
        <div className="flex items-center space-x-2">
          <LogTimeDialog />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Ticket</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries?.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{format(new Date(entry.date), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{entry.ticket?.project?.name || "Unknown Project"}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                       #{entry.ticket?.id} - {entry.ticket?.title}
                    </TableCell>
                    <TableCell>{entry.hours}h</TableCell>
                    <TableCell className="text-muted-foreground">{entry.description}</TableCell>
                  </TableRow>
                ))}
                {!entries?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No time entries found. Log your first work item!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
