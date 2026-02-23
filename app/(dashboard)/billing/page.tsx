"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Loader2, DollarSign, FileText, FolderOpen, TrendingUp } from "lucide-react";
import { EmptyExpensesIllustration } from "@/components/illustrations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from "@/components/ui/dialog";

export default function BillingPage() {
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [hourlyRate, setHourlyRate] = useState<number>(50);

  const { data: summary, isLoading } = api.project.getBillingSummary.useQuery({
      startDate,
      endDate
  });

  const totalRevenue = summary?.reduce((acc, curr) => acc + (curr.totalHours || 0) * hourlyRate, 0) || 0;

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Billing & Invoices</h2>
          <p className="text-muted-foreground mt-1">
            {summary ? (
              <>
                {summary.length} {summary.length === 1 ? "project" : "projects"} billable — ${totalRevenue.toFixed(2)} estimated revenue
              </>
            ) : (
              "Calculate billing from tracked time entries"
            )}
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="grid gap-2">
            <Label>Start Date</Label>
            <Input 
                type="date" 
                value={format(startDate, "yyyy-MM-dd")} 
                onChange={(e) => setStartDate(new Date(e.target.value))}
            />
          </div>
          <div className="grid gap-2">
            <Label>End Date</Label>
            <Input 
                type="date" 
                value={format(endDate, "yyyy-MM-dd")} 
                onChange={(e) => setEndDate(new Date(e.target.value))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Hourly Rate ($)</Label>
            <Input 
                type="number" 
                value={hourlyRate} 
                onChange={(e) => setHourlyRate(parseFloat(e.target.value) || 0)}
                className="w-[150px]"
            />
          </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Billable Hours</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    {summary?.reduce((acc, curr) => acc + (curr.totalHours || 0), 0).toFixed(1)}h
                </div>
                <p className="text-xs text-muted-foreground">In selected period</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estimated Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    ${totalRevenue.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">At ${hourlyRate}/h rate</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Projects Billed</CardTitle>
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{summary?.length || 0}</div>
                <p className="text-xs text-muted-foreground">With billable activity</p>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg per Project</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">
                    ${summary && summary.length > 0 ? (totalRevenue / summary.length).toFixed(2) : "0.00"}
                </div>
                <p className="text-xs text-muted-foreground">Average billing amount</p>
            </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Summary</CardTitle>
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
                  <TableHead>Project</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary?.map((item) => (
                  <TableRow key={item.projectId}>
                    <TableCell className="font-medium">{item.projectName}</TableCell>
                    <TableCell>{item.totalHours?.toFixed(1) || 0}h</TableCell>
                    <TableCell>${hourlyRate}/h</TableCell>
                    <TableCell>${((item.totalHours || 0) * hourlyRate).toFixed(2)}</TableCell>
                    <TableCell>
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  Generate Invoice
                                  <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">Preview</Badge>
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Invoice Preview</DialogTitle>
                                    <DialogDescription>
                                        Draft invoice for {item.projectName}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                     <div className="flex justify-between border-b pb-2">
                                         <span className="font-bold">Period:</span>
                                         <span>{format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}</span>
                                     </div>
                                     <div className="flex justify-between">
                                         <span>Total Hours:</span>
                                         <span>{item.totalHours?.toFixed(1) || 0}h</span>
                                     </div>
                                     <div className="flex justify-between">
                                         <span>Rate:</span>
                                         <span>${hourlyRate}/h</span>
                                     </div>
                                     <div className="flex justify-between border-t pt-2 font-bold text-lg">
                                         <span>Total Due:</span>
                                         <span>${((item.totalHours || 0) * hourlyRate).toFixed(2)}</span>
                                     </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={() => toast.success("Invoice sent to client (Mock)")}>Send Invoice</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
                 {!summary?.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center gap-3">
                        <EmptyExpensesIllustration />
                        <p>No billable activity in this period.</p>
                      </div>
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
