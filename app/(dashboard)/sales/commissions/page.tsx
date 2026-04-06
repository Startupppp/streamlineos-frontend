"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  DollarSign,
  Plus,
  Clock,
  CheckCircle2,
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { useCommissions, useCommissionRules, useCreateCommissionRule } from "@/lib/api/hooks/crm";
import { toast } from "sonner";

function fmt(amount: string | number) {
  return `₹${Number(amount).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  paid: { label: "Paid", variant: "outline" },
};

export default function CommissionsPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const { data, isLoading } = useCommissions({ status: statusFilter });
  const { data: rules } = useCommissionRules();
  const createRule = useCreateCommissionRule();

  const items = (data?.items ?? []) as Array<{
    id: number;
    userName: string | null;
    dealName: string | null;
    dealValue: string;
    commissionRate: string;
    commissionAmount: string;
    status: string;
    createdAt: string | null;
  }>;

  function handleCreateRule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createRule.mutate(
      {
        name: fd.get("name") as string,
        type: fd.get("type") as string,
        flatRate: fd.get("flatRate") as string,
      },
      {
        onSuccess: () => {
          toast.success("Commission rule created");
          setRuleDialogOpen(false);
        },
        onError: () => toast.error("Failed to create rule"),
      },
    );
  }

  return (
    <PageWrapper
      title="Commissions"
      subtitle="Track earned commissions"
      actions={
        <Button size="sm" variant="outline" onClick={() => setRuleDialogOpen(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Commission Rule
        </Button>
      }
      filters={
        <Tabs value={statusFilter ?? "all"} onValueChange={(v) => setStatusFilter(v === "all" ? undefined : v)}>
          <TabsList className="h-8">
            <TabsTrigger value="all" className="text-xs px-3 h-7">All</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs px-3 h-7">Pending</TabsTrigger>
            <TabsTrigger value="approved" className="text-xs px-3 h-7">Approved</TabsTrigger>
            <TabsTrigger value="paid" className="text-xs px-3 h-7">Paid</TabsTrigger>
          </TabsList>
        </Tabs>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Pending" value={fmt(data?.totalPending ?? 0)} icon={Clock} color="gold" />
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                    </TableRow>
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No commissions found.</TableCell>
                    </TableRow>
                  ) : (
                    items.map((c) => {
                      const badge = STATUS_BADGE[c.status] ?? { label: c.status, variant: "secondary" as const };
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium text-sm">{c.userName ?? "—"}</TableCell>
                          <TableCell className="text-sm">{c.dealName ?? "—"}</TableCell>
                          <TableCell className="text-right text-sm">{fmt(c.dealValue)}</TableCell>
                          <TableCell className="text-right text-sm">{Number(c.commissionRate)}%</TableCell>
                          <TableCell className="text-right font-medium text-sm">{fmt(c.commissionAmount)}</TableCell>
                          <TableCell>
                            <Badge variant={badge.variant} className="text-[11px]">{badge.label}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>

        {/* Commission Rules */}
        {Array.isArray(rules) && rules.length > 0 && (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold">Commission Rules</p>
            </div>
            <div className="p-4 space-y-2">
              {rules.map((r: Record<string, unknown>) => (
                <div key={String(r.id)} className="flex items-center justify-between text-sm py-1.5 px-2 rounded-md bg-muted/40">
                  <span className="font-medium">{String(r.name)}</span>
                  <span className="text-muted-foreground">
                    {r.type === "flat_percent" ? `${r.flatRate}%` : "Tiered"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Commission Rule</DialogTitle>
            <DialogDescription>Define how commissions are calculated for deals.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateRule} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Rule Name</Label>
              <Input name="name" placeholder="e.g. Standard 5%" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select name="type" defaultValue="flat_percent">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat_percent">Flat Percentage</SelectItem>
                  <SelectItem value="tiered">Tiered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="flatRate">Rate (%)</Label>
              <Input name="flatRate" type="number" step="0.1" placeholder="e.g. 5" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRuleDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createRule.isPending}>
                {createRule.isPending ? "Creating..." : "Create Rule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
