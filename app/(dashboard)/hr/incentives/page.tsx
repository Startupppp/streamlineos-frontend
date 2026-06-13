"use client";
import { getErrorMessage } from "@/lib/get-error-message";

import { useState, useTransition, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import {
  IndianRupee, CheckCircle2, XCircle, Clock, Settings,
  TrendingUp, Users, Percent,
} from "lucide-react";
import {
  useHrIncentiveStats,
  useHrIncentives,
  useHrIncentiveConfigs,
  useApproveIncentive,
  useRejectIncentive,
  useSetIncentiveConfig,
} from "@/lib/api/hooks/hr";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-400",
  APPROVED: "bg-emerald-500/10 text-emerald-400",
  REJECTED: "bg-red-500/10 text-red-400",
  ADDED_TO_PAYROLL: "bg-blue-500/10 text-blue-400",
};

function formatINR(val: string | number | null | undefined): string {
  if (!val) return "—";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
}

export default function IncentivesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const statusFilter = searchParams.get("status") || "all";
  const page = Number(searchParams.get("page")) || 1;

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname],
  );

  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [newRate, setNewRate] = useState("");
  const [approveModal, setApproveModal] = useState<{ id: number; calculated: string } | null>(null);
  const [approveAmount, setApproveAmount] = useState("");
  const [approveNotes, setApproveNotes] = useState("");

  const qc = useQueryClient();

  const { data: stats } = useHrIncentiveStats();
  const { data, isLoading } = useHrIncentives({
    status: statusFilter !== "all" ? statusFilter as "PENDING" | "APPROVED" | "REJECTED" | "ADDED_TO_PAYROLL" : undefined,
    page,
    limit: 25,
  });
  const { data: configs } = useHrIncentiveConfigs();

  const approveMutation = useApproveIncentive();
  const rejectMutation = useRejectIncentive();
  const setConfigMutation = useSetIncentiveConfig();

  const incentivesList = data?.incentives ?? [];
  const currentConfig = configs?.[0];

  function handleStatusFilterChange(v: string) {
    updateParams({ status: v === "all" ? null : v, page: null });
  }

  function handleApproveOpen(id: number, calculated: string) {
    setApproveModal({ id, calculated });
    setApproveAmount(calculated);
    setApproveNotes("");
  }

  function handleApproveClose() {
    setApproveModal(null);
  }

  function handleApproveConfirm() {
    if (!approveModal) return;
    approveMutation.mutate(
      { id: approveModal.id, approvedAmount: approveAmount, notes: approveNotes || undefined },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: queryKeys.hr.incentives() });
          toast.success("Incentive approved");
          setApproveModal(null);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }

  function handleReject(id: number) {
    rejectMutation.mutate(
      { id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: queryKeys.hr.incentives() });
          toast.success("Incentive rejected");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }

  function handleSetRate() {
    const parsed = parseFloat(newRate);
    if (!newRate || isNaN(parsed) || parsed < 0 || parsed > 100) {
      toast.error("Incentive rate must be between 0 and 100");
      return;
    }
    if (!/^\d{1,5}(\.\d{1,2})?$/.test(newRate)) {
      toast.error("Rate must have at most 2 decimal places");
      return;
    }
    setConfigMutation.mutate(
      { incentiveRate: newRate },
      {
        onSuccess: () => {
          toast.success("Incentive rate updated");
          setShowConfigDialog(false);
          setNewRate("");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      }
    );
  }

  return (
    <PageWrapper
      title="Incentive Management"
      subtitle="Manage sales incentives, approvals, and rate configuration"
      actions={
        <Button variant="outline" size="sm" onClick={() => setShowConfigDialog(true)}>
          <Settings className="h-4 w-4 mr-1" /> Configure Rate
        </Button>
      }
      filters={
        <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className="w-[150px] h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All Status</SelectItem>
            <SelectItem value="PENDING" className="text-xs">Pending</SelectItem>
            <SelectItem value="APPROVED" className="text-xs">Approved</SelectItem>
            <SelectItem value="REJECTED" className="text-xs">Rejected</SelectItem>
            <SelectItem value="ADDED_TO_PAYROLL" className="text-xs">Added to Payroll</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <div className="space-y-6">

        <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
          {[
            { label: "This Month", value: formatINR(stats?.thisMonth), icon: IndianRupee, color: "text-emerald-400" },
            { label: "Total Revenue", value: formatINR(stats?.totalRevenue), icon: TrendingUp, color: "text-blue-400" },
            { label: "Avg / Conversion", value: formatINR(stats?.avgPerConversion), icon: Users, color: "text-purple-400" },
            { label: "Pending", value: stats?.pending ?? 0, icon: Clock, color: "text-amber-400" },
            { label: "Approved", value: stats?.approved ?? 0, icon: CheckCircle2, color: "text-emerald-400" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <s.icon className={cn("h-5 w-5", s.color)} />
                  <span className={cn("text-xl font-bold tabular-nums", s.color)}>{s.value}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {currentConfig && (
          <Card className="bg-blue-500/5 border-blue-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Percent className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Current Incentive Rate: <span className="text-blue-600 font-bold">{currentConfig.incentiveRate}%</span></p>
                <p className="text-xs text-muted-foreground">Effective from {new Date(currentConfig.effectiveFrom).toLocaleDateString("en-IN")}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <ScrollArea className="w-full max-h-[60vh]" type="auto">
            <div className="min-w-max">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Sales Rep</TableHead>
                  <TableHead className="text-xs">Client</TableHead>
                  <TableHead className="text-xs">Investment</TableHead>
                  <TableHead className="text-xs">Rate</TableHead>
                  <TableHead className="text-xs">Calculated</TableHead>
                  <TableHead className="text-xs">Approved</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={8} className="h-12"><Skeleton className="h-4 w-full" /></TableCell></TableRow>
                  ))
                ) : incentivesList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      No incentives found
                    </TableCell>
                  </TableRow>
                ) : (
                  incentivesList.map((inc) => (
                    <TableRow key={inc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={inc.salesRep?.image || ""} />
                            <AvatarFallback className="text-[9px]">{inc.salesRep?.name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{inc.salesRep?.name || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{inc.clientAccount?.clientName || "—"}</TableCell>
                      <TableCell className="text-xs font-mono">{formatINR(inc.investmentAmount)}</TableCell>
                      <TableCell className="text-xs">{inc.incentiveRate}%</TableCell>
                      <TableCell className="text-xs font-mono font-medium">{formatINR(inc.calculatedAmount)}</TableCell>
                      <TableCell className="text-xs font-mono text-emerald-400">{inc.approvedAmount ? formatINR(inc.approvedAmount) : "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px] border-0", STATUS_COLORS[inc.status])}>
                          {inc.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {inc.status === "PENDING" && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-emerald-400 hover:text-emerald-300"
                              onClick={() => handleApproveOpen(inc.id, inc.calculatedAmount)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-red-400 hover:text-red-300"
                              onClick={() => handleReject(inc.id)}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            </div>
          </ScrollArea>
          {(data?.totalPages ?? 0) > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <span className="text-xs text-muted-foreground">Page {data?.page} of {data?.totalPages}</span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => updateParams({ page: page <= 2 ? null : String(page - 1) })}>Prev</Button>
                <Button variant="outline" size="sm" disabled={page >= (data?.totalPages ?? 1)} onClick={() => updateParams({ page: String(page + 1) })}>Next</Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={!!approveModal} onOpenChange={(open) => !open && handleApproveClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Incentive</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Calculated Amount</Label>
              <p className="text-lg font-bold">{formatINR(approveModal?.calculated)}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Approved Amount (adjust if needed)</Label>
              <Input type="number" value={approveAmount} onChange={(e) => setApproveAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={approveNotes} onChange={(e) => setApproveNotes(e.target.value)} placeholder="Optional notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleApproveClose}>Cancel</Button>
            <Button
              onClick={handleApproveConfirm}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Incentive Rate</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {currentConfig && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground">Current Rate</p>
                <p className="text-lg font-bold">{currentConfig.incentiveRate}%</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>New Incentive Rate (%)</Label>
              <Input
                inputMode="decimal"
                value={newRate}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || /^\d{0,5}(\.\d{0,2})?$/.test(val)) setNewRate(val);
                }}
                placeholder="e.g., 2.50"
              />
              <p className="text-xs text-muted-foreground">
                This will be applied to all new investments going forward.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>Cancel</Button>
            <Button
              disabled={!newRate || setConfigMutation.isPending}
              onClick={handleSetRate}
            >
              Set Rate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
