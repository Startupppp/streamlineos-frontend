"use client";

import { useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Clock,
  CheckCircle2,
  Check,
  BadgeIndianRupee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { useCommissions, useCommissionRules, useCreateCommissionRule, useUpdateCommissionStatus, type CommissionItem, type CommissionRule } from "@/hooks/api/crm";
import { useCan } from "@/hooks/api/access";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { EmptyExpensesIllustration } from "@/components/illustrations";

function fmt(amount: string | number) {
  return `₹${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  paid: { label: "Paid", variant: "outline" },
};

interface PendingAction {
  id: number;
  userName: string | null;
  status: "approved" | "paid";
}

interface CommissionActionCellProps {
  commissionId: number;
  userName: string | null;
  status: string;
  onAction: (action: PendingAction) => void;
}

function CommissionActionCell({ commissionId, userName, status, onAction }: CommissionActionCellProps) {
  const handleApprove = useCallback(() => {
    onAction({ id: commissionId, userName, status: "approved" });
  }, [commissionId, userName, onAction]);

  const handleMarkPaid = useCallback(() => {
    onAction({ id: commissionId, userName, status: "paid" });
  }, [commissionId, userName, onAction]);

  if (status !== "pending") {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleApprove}>
        <Check className="h-3.5 w-3.5 mr-1" />
        Approve
      </Button>
      <Button size="sm" className="h-7 text-xs" onClick={handleMarkPaid}>
        <BadgeIndianRupee className="h-3.5 w-3.5 mr-1" />
        Mark Paid
      </Button>
    </div>
  );
}

export default function CommissionsPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [ruleType, setRuleType] = useState("flat_percent");
  const [ruleRate, setRuleRate] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const canManage = useCan("crm:targets:manage");

  const { data, isLoading } = useCommissions({ status: statusFilter });
  const { data: rules } = useCommissionRules();
  const createRule = useCreateCommissionRule();
  const updateStatus = useUpdateCommissionStatus();

  const handleOpenRuleDialog = useCallback(() => setRuleDialogOpen(true), []);
  const handleCloseRuleDialog = useCallback(() => setRuleDialogOpen(false), []);
  const handleStatusFilterChange = useCallback((v: string) => setStatusFilter(v === "all" ? undefined : v), []);
  const handlePendingDialogChange = useCallback((open: boolean) => { if (!open) setPendingAction(null); }, []);
  const handleRuleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setRuleName(e.target.value), []);
  const handleRuleRateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setRuleRate(e.target.value), []);
  const handleRuleDialogChange = useCallback((open: boolean) => setRuleDialogOpen(open), []);
  const handleRuleTypeChange = useCallback((v: string) => setRuleType(v), []);
  const handleCommissionAction = useCallback((action: PendingAction) => setPendingAction(action), []);

  const items: CommissionItem[] = data?.items ?? [];

  const handleConfirmAction = useCallback(() => {
    if (!pendingAction) return;
    updateStatus.mutate(
      { id: pendingAction.id, status: pendingAction.status },
      {
        onSuccess: () => {
          toast.success(pendingAction.status === "paid" ? "Commission marked as paid" : "Commission approved");
          setPendingAction(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [pendingAction, updateStatus]);

  const handleCreateRule = useCallback(() => {
    if (!ruleName.trim()) { toast.error("Rule name is required"); return; }
    let flatRate: string | undefined;
    if (ruleType === "flat_percent") {
      const rate = Number(ruleRate);
      if (!ruleRate.trim() || !Number.isFinite(rate) || rate < 0 || rate > 100) {
        toast.error("Rate must be a number between 0 and 100");
        return;
      }
      flatRate = String(rate);
    }
    createRule.mutate(
      { name: ruleName.trim(), type: ruleType, flatRate },
      {
        onSuccess: () => { toast.success("Commission rule created"); setRuleDialogOpen(false); setRuleName(""); setRuleRate(""); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [ruleName, ruleType, ruleRate, createRule]);

  return (
    <PageWrapper
      title="Commissions"
      subtitle="Track earned commissions"
      actions={
        <Button size="sm" variant="outline" onClick={handleOpenRuleDialog}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Commission Rule
        </Button>
      }
      filters={
        <Tabs value={statusFilter ?? "all"} onValueChange={handleStatusFilterChange}>
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs px-3 h-7">All</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs px-3 h-7">Pending</TabsTrigger>
            <TabsTrigger value="approved" className="text-xs px-3 h-7">Approved</TabsTrigger>
            <TabsTrigger value="paid" className="text-xs px-3 h-7">Paid</TabsTrigger>
          </TabsList>
        </Tabs>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <StatCard label="Pending" value={fmt(data?.totalPending ?? 0)} icon={Clock} color="amber" />
          <StatCard label="Paid" value={fmt(data?.totalPaid ?? 0)} icon={CheckCircle2} color="green" />
        </div>

        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <ScrollArea className="w-full" type="auto">
            <div className="min-w-[700px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rep</TableHead>
                    <TableHead>Deal</TableHead>
                    <TableHead className="text-right">Deal Value</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead>Status</TableHead>
                    {canManage && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        {canManage && <TableCell><Skeleton className="h-7 w-24 ml-auto" /></TableCell>}
                      </TableRow>
                    ))
                  ) : items.length === 0 ? (
                    <TableRow><TableCell colSpan={canManage ? 7 : 6} className="text-center py-8 text-muted-foreground"><div className="flex flex-col items-center justify-center gap-2 py-2">
                      <EmptyExpensesIllustration className="h-36 w-36 opacity-95" />
                      <p>No commissions found.</p>
                    </div></TableCell></TableRow>
                  ) : items.map((c) => {
                    const badge = STATUS_BADGE[c.status] ?? { label: c.status, variant: "secondary" as const };
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium text-sm">{c.userName ?? "—"}</TableCell>
                        <TableCell className="text-sm">{c.dealName ?? "—"}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(c.dealValue)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{Number(c.commissionRate).toFixed(2)}%</TableCell>
                        <TableCell className="text-right font-medium text-sm">{fmt(c.commissionAmount)}</TableCell>
                        <TableCell><Badge variant={badge.variant} className="text-[11px]">{badge.label}</Badge></TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            <CommissionActionCell
                              commissionId={c.id}
                              userName={c.userName}
                              status={c.status}
                              onAction={handleCommissionAction}
                            />
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>

        {Array.isArray(rules) && rules.length > 0 && (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold">Commission Rules</p>
            </div>
            <div className="p-4 space-y-2">
              {rules.map((r) => (
                <div key={r.id} className="flex items-center justify-between text-sm py-1.5 px-2 rounded-md bg-muted/40">
                  <span className="font-medium truncate min-w-0">{r.name}</span>
                  <span className="text-muted-foreground tabular-nums shrink-0">{r.type === "flat_percent" ? `${Number(r.flatRate).toFixed(2)}%` : "Tiered"}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={ruleDialogOpen} onOpenChange={handleRuleDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Commission Rule</DialogTitle>
            <DialogDescription>Define how commissions are calculated for deals.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Rule Name</label>
              <Input value={ruleName} onChange={handleRuleNameChange} placeholder="e.g. Standard 5%" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Type</label>
              <Select value={ruleType} onValueChange={handleRuleTypeChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat_percent">Flat Percentage</SelectItem>
                  <SelectItem value="tiered">Tiered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Rate (%)</label>
              <Input value={ruleRate} onChange={handleRuleRateChange} type="number" min="0" max="100" step="0.1" placeholder="e.g. 5" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseRuleDialog}>Cancel</Button>
            <Button onClick={handleCreateRule} disabled={createRule.isPending}>
              {createRule.isPending ? "Creating..." : "Create Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingAction} onOpenChange={handlePendingDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.status === "paid" ? "Mark commission as paid?" : "Approve commission?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.status === "paid"
                ? `This will mark ${pendingAction?.userName ?? "this rep"}'s commission as paid and notify them.`
                : `This will approve ${pendingAction?.userName ?? "this rep"}'s commission and notify them.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateStatus.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAction} disabled={updateStatus.isPending}>
              {updateStatus.isPending ? "Saving…" : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
