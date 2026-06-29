"use client";

import { getErrorMessage } from "@/lib/get-error-message";
import { useState, useTransition, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  IndianRupee,
  CheckCircle2,
  XCircle,
  Clock,
  Settings,
  TrendingUp,
  Users,
  Percent,
  History,
  Banknote,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import {
  useHrIncentiveStats,
  useHrIncentives,
  useHrIncentiveConfigs,
  useApproveIncentive,
  useRejectIncentive,
  useSetIncentiveConfig,
} from "@/hooks/api/hr";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { formatINR } from "@/lib/format-utils";

type IncentiveItem = NonNullable<ReturnType<typeof useHrIncentives>["data"]>["incentives"][number];

function getStatusConfig(status: string) {
  if (status === "APPROVED") {
    return {
      badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      icon: <CheckCircle2 className="h-2.5 w-2.5" />,
    };
  }
  if (status === "REJECTED") {
    return {
      badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800",
      icon: <XCircle className="h-2.5 w-2.5" />,
    };
  }
  if (status === "ADDED_TO_PAYROLL") {
    return {
      badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      icon: <Banknote className="h-2.5 w-2.5" />,
    };
  }
  return {
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    icon: <Clock className="h-2.5 w-2.5" />,
  };
}

interface IncentiveTableRowProps {
  incentive: IncentiveItem;
  onApprove: (id: number, calculated: string) => void;
  onReject: (id: number) => void;
  isRejecting: boolean;
}

function IncentiveTableRow({ incentive: inc, onApprove, onReject, isRejecting }: IncentiveTableRowProps) {
  const handleApproveClick = useCallback(
    () => onApprove(inc.id, inc.calculatedAmount ?? ""),
    [onApprove, inc.id, inc.calculatedAmount],
  );
  const handleRejectClick = useCallback(() => onReject(inc.id), [onReject, inc.id]);

  const statusCfg = getStatusConfig(inc.status);
  const calculated = parseFloat(inc.calculatedAmount ?? "0");
  const approved = inc.approvedAmount ? parseFloat(inc.approvedAmount) : null;
  const payoutPct =
    calculated > 0 && approved !== null
      ? Math.min(Math.round((approved / calculated) * 100), 100)
      : null;

  return (
    <TableRow className="hover:bg-muted/20 transition-colors duration-200">
      <TableCell>
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={inc.salesRep?.image || ""} />
            <AvatarFallback className="text-[9px]">
              {inc.salesRep?.name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium">{inc.salesRep?.name || "—"}</span>
        </div>
      </TableCell>
      <TableCell className="text-xs">{inc.clientAccount?.clientName || "—"}</TableCell>
      <TableCell className="text-xs font-mono tabular-nums">
        {inc.investmentAmount ? formatINR(inc.investmentAmount) : "—"}
      </TableCell>
      <TableCell>
        <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300 border-slate-200 dark:border-slate-800">
          {inc.incentiveRate}%
        </span>
      </TableCell>
      <TableCell className="min-w-[160px]">
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">
              Target:{" "}
              <span className="font-medium text-foreground">
                {inc.calculatedAmount ? formatINR(inc.calculatedAmount) : "—"}
              </span>
            </span>
            {approved !== null && (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {inc.approvedAmount ? formatINR(inc.approvedAmount) : "—"}
              </span>
            )}
          </div>
          {payoutPct !== null && (
            <Progress value={payoutPct} className="h-1.5 bg-muted" />
          )}
        </div>
      </TableCell>
      <TableCell>
        <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border", statusCfg.badge)}>
          {statusCfg.icon}
          {inc.status}
        </span>
      </TableCell>
      <TableCell>
        {inc.status === "PENDING" && (
          <div className="flex gap-1">
            <Button
              size="sm"
              className="h-7 gap-1 text-xs"
              onClick={handleApproveClick}
            >
              <CheckCircle2 className="h-3 w-3" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              onClick={handleRejectClick}
              disabled={isRejecting}
            >
              <XCircle className="h-3 w-3" />
              Reject
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
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
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [newRate, setNewRate] = useState("");
  const [approveModal, setApproveModal] = useState<{ id: number; calculated: string } | null>(null);
  const [approveAmount, setApproveAmount] = useState("");
  const [approveNotes, setApproveNotes] = useState("");

  const qc = useQueryClient();

  const { data: stats } = useHrIncentiveStats();
  const { data, isLoading, isError } = useHrIncentives({
    status:
      statusFilter !== "all"
        ? (statusFilter as "PENDING" | "APPROVED" | "REJECTED" | "ADDED_TO_PAYROLL")
        : undefined,
    page,
    limit: 25,
  });
  const { data: configs } = useHrIncentiveConfigs();

  const approveMutation = useApproveIncentive();
  const rejectMutation = useRejectIncentive();
  const setConfigMutation = useSetIncentiveConfig();

  const incentivesList = data?.incentives ?? [];
  const currentConfig = configs?.[0];

  const handleStatusFilterChange = useCallback((v: string) => {
    updateParams({ status: v === "all" ? null : v, page: null });
  }, [updateParams]);

  const handleApproveOpen = useCallback((id: number, calculated: string) => {
    setApproveModal({ id, calculated });
    setApproveAmount(calculated);
    setApproveNotes("");
  }, []);

  const handleApproveClose = useCallback(() => {
    setApproveModal(null);
  }, []);

  const handleApproveDialogOpenChange = useCallback((open: boolean) => {
    if (!open) handleApproveClose();
  }, [handleApproveClose]);

  const handleApproveAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setApproveAmount(e.target.value);
  }, []);

  const handleApproveNotesChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setApproveNotes(e.target.value);
  }, []);

  const handleApproveConfirm = useCallback(() => {
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
      },
    );
  }, [approveModal, approveAmount, approveNotes, approveMutation, qc]);

  const handleReject = useCallback((id: number) => {
    rejectMutation.mutate(
      { id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: queryKeys.hr.incentives() });
          toast.success("Incentive rejected");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [rejectMutation, qc]);

  const handleRateInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") { setNewRate(""); return; }
    const dotIndex = raw.indexOf(".");
    if (dotIndex !== -1) {
      const decimals = raw.slice(dotIndex + 1);
      if (decimals.length > 4) { setNewRate(raw.slice(0, dotIndex + 5)); return; }
    }
    if (/^\d{0,5}(\.\d{0,4})?$/.test(raw)) setNewRate(raw);
  }, []);

  const handleSetRate = useCallback(() => {
    const parsed = parseFloat(newRate);
    if (!newRate || isNaN(parsed) || parsed < 0 || parsed > 100) {
      toast.error("Incentive rate must be between 0 and 100");
      return;
    }
    if (!/^\d{1,5}(\.\d{1,4})?$/.test(newRate)) {
      toast.error("Rate must have at most 4 decimal places");
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
      },
    );
  }, [newRate, setConfigMutation]);

  const handleOpenConfigDialog = useCallback(() => setShowConfigDialog(true), []);
  const handleCloseConfigDialog = useCallback(() => setShowConfigDialog(false), []);
  const handleOpenHistory = useCallback(() => setShowHistoryDialog(true), []);
  const handleCloseHistory = useCallback(() => setShowHistoryDialog(false), []);

  const handlePrevPage = useCallback(() => {
    updateParams({ page: page <= 2 ? null : String(page - 1) });
  }, [page, updateParams]);

  const handleNextPage = useCallback(() => {
    updateParams({ page: String(page + 1) });
  }, [page, updateParams]);

  return (
    <PageWrapper
      title="Incentive Management"
      subtitle="Manage sales incentives, approvals, and rate configuration"
      actions={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleOpenHistory}>
            <History className="h-3.5 w-3.5" />
            Rate History
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleOpenConfigDialog}>
            <Settings className="h-3.5 w-3.5" />
            Configure Rate
          </Button>
        </div>
      }
      filters={
        <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
          <SelectTrigger className="h-8 text-xs w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="w-[var(--radix-select-trigger-width)]">
            <SelectItem value="all" className="text-xs">All Status</SelectItem>
            <SelectItem value="PENDING" className="text-xs">Pending</SelectItem>
            <SelectItem value="APPROVED" className="text-xs">Approved</SelectItem>
            <SelectItem value="REJECTED" className="text-xs">Rejected</SelectItem>
            <SelectItem value="ADDED_TO_PAYROLL" className="text-xs">Added to Payroll</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
          <StatCard label="This Month" value={stats?.thisMonth ? formatINR(stats.thisMonth) : "—"} icon={IndianRupee} color="green" index={0} />
          <StatCard label="Total Revenue" value={stats?.totalRevenue ? formatINR(stats.totalRevenue) : "—"} icon={TrendingUp} color="blue" index={1} />
          <StatCard label="Avg / Conversion" value={stats?.avgPerConversion ? formatINR(stats.avgPerConversion) : "—"} icon={Users} color="violet" index={2} />
          <StatCard label="Pending" value={stats?.pending ?? 0} icon={Clock} color="amber" index={3} />
          <StatCard label="Approved" value={stats?.approved ?? 0} icon={CheckCircle2} color="green" index={4} />
        </div>

        {currentConfig && (
          <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden border-l-4 border-l-blue-500">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
                <Percent className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Current Incentive Rate:{" "}
                  <span className="text-blue-600 dark:text-blue-400">{currentConfig.incentiveRate}%</span>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Effective from{" "}
                  {new Date(currentConfig.effectiveFrom).toLocaleDateString("en-IN")}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <ScrollArea className="w-full max-h-[60vh]" type="auto">
            <div className="min-w-max">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-semibold text-foreground/80 text-xs">Sales Rep</TableHead>
                    <TableHead className="font-semibold text-foreground/80 text-xs">Client</TableHead>
                    <TableHead className="font-semibold text-foreground/80 text-xs">Investment</TableHead>
                    <TableHead className="font-semibold text-foreground/80 text-xs">Rate</TableHead>
                    <TableHead className="font-semibold text-foreground/80 text-xs">Target vs Payout</TableHead>
                    <TableHead className="font-semibold text-foreground/80 text-xs">Status</TableHead>
                    <TableHead className="font-semibold text-foreground/80 text-xs">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7} className="h-12">
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : isError ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-0">
                        <EmptyState
                          compact
                          illustration={<XCircle className="h-8 w-8 text-muted-foreground" />}
                          title="Failed to load incentives"
                          description="Please refresh the page to try again."
                        />
                      </TableCell>
                    </TableRow>
                  ) : incentivesList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-0">
                        <EmptyState
                          compact
                          illustration={<IndianRupee className="h-8 w-8 text-muted-foreground" />}
                          title="No incentives found"
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    incentivesList.map((inc) => (
                      <IncentiveTableRow
                        key={inc.id}
                        incentive={inc}
                        onApprove={handleApproveOpen}
                        onReject={handleReject}
                        isRejecting={rejectMutation.isPending}
                      />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
          {(data?.totalPages ?? 0) > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Page {data?.page} of {data?.totalPages}
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={handlePrevPage}>
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= (data?.totalPages ?? 1)}
                  onClick={handleNextPage}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Dialog open={!!approveModal} onOpenChange={handleApproveDialogOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Approve Incentive</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Calculated Amount</Label>
              <p className="text-lg font-bold">
                {approveModal?.calculated ? formatINR(approveModal.calculated) : "—"}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Approved Amount (adjust if needed)</Label>
              <Input type="number" value={approveAmount} onChange={handleApproveAmountChange} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={approveNotes} onChange={handleApproveNotesChange} placeholder="Optional notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleApproveClose}>Cancel</Button>
            <Button onClick={handleApproveConfirm} disabled={approveMutation.isPending}>
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
                onChange={handleRateInputChange}
                placeholder="e.g., 2.50"
              />
              <p className="text-xs text-muted-foreground">
                This will be applied to all new investments going forward.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseConfigDialog}>Cancel</Button>
            <Button disabled={!newRate || setConfigMutation.isPending} onClick={handleSetRate}>
              Set Rate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              Incentive Rate History
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {!configs || configs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No rate history found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-semibold text-foreground/80 text-xs">Rate</TableHead>
                    <TableHead className="font-semibold text-foreground/80 text-xs">Effective From</TableHead>
                    <TableHead className="font-semibold text-foreground/80 text-xs">Set By</TableHead>
                    <TableHead className="font-semibold text-foreground/80 text-xs">Set On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map((cfg, idx) => (
                    <TableRow key={cfg.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={cn("font-semibold tabular-nums text-sm", idx === 0 ? "text-blue-600" : "text-foreground")}>
                            {cfg.incentiveRate}%
                          </span>
                          {idx === 0 && (
                            <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                              Current
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(cfg.effectiveFrom).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-xs">{cfg.createdByName ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {cfg.createdAt
                          ? new Date(cfg.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseHistory}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
