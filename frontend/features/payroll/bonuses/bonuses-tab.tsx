"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserCombobox } from "@/components/ui/user-combobox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MonthPicker } from "@/features/payroll/shared/month-picker";
import { BonusStatusBadge } from "./bonus-status-badge";
import { formatMoney } from "@/features/payroll/shared/payroll-format";
import {
  useBonuses,
  useUpdateBonus,
  useCreateBonus,
  type Bonus,
  type BonusType,
} from "@/hooks/api/payroll/bonuses-admin";
import { useCan } from "@/hooks/api/access";
import { EmptyReportIllustration } from "@/components/illustrations";
import { TruncatedText } from "@/components/ui/truncated-text";

const TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "PERFORMANCE", label: "Performance" },
  { value: "FESTIVAL", label: "Festival" },
  { value: "REFERRAL", label: "Referral" },
  { value: "SPOT", label: "Spot Award" },
  { value: "ANNUAL", label: "Annual" },
  { value: "JOINING", label: "Joining" },
  { value: "RETENTION", label: "Retention" },
  { value: "COMMISSION", label: "Commission" },
  { value: "ADJUSTMENT", label: "Adjustment" },
];

const CREATE_TYPE_OPTIONS: { value: BonusType; label: string }[] = [
  { value: "PERFORMANCE", label: "Performance" },
  { value: "FESTIVAL", label: "Festival" },
  { value: "REFERRAL", label: "Referral" },
  { value: "SPOT", label: "Spot Award" },
  { value: "ANNUAL", label: "Annual" },
  { value: "JOINING", label: "Joining" },
  { value: "RETENTION", label: "Retention" },
  { value: "COMMISSION", label: "Commission" },
  { value: "ADJUSTMENT", label: "Adjustment" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "PAID", label: "Paid" },
];

const TYPE_COLORS: Record<string, string> = {
  PERFORMANCE: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  FESTIVAL: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/30",
  REFERRAL: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/30",
  SPOT: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  ANNUAL: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  JOINING: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/30",
  RETENTION: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/30",
  COMMISSION: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-500/10 dark:text-orange-300 dark:border-orange-500/30",
  ADJUSTMENT: "bg-muted text-muted-foreground border-border",
};

const createBonusSchema = z.object({
  userId: z.string().min(1, "Employee ID is required"),
  type: z.enum([
    "PERFORMANCE",
    "FESTIVAL",
    "REFERRAL",
    "SPOT",
    "ANNUAL",
    "JOINING",
    "RETENTION",
    "COMMISSION",
    "ADJUSTMENT",
  ]),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => {
      const n = parseFloat(v);
      return Number.isFinite(n) && n > 0;
    }, "Amount must be a positive number"),
  month: z.string().min(1, "Month is required"),
  reason: z.string().optional(),
  taxable: z.boolean(),
});

type CreateBonusValues = z.infer<typeof createBonusSchema>;

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getBonusMonth(bonus: Bonus): string | null {
  if (bonus.month) return bonus.month;
  if (!bonus.createdAt) return null;
  const d = new Date(bonus.createdAt);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface CreateBonusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateBonusDialog({ open, onOpenChange }: CreateBonusDialogProps) {
  const createBonus = useCreateBonus();

  const form = useForm<CreateBonusValues>({
    resolver: zodResolver(createBonusSchema),
    defaultValues: {
      userId: "",
      type: "PERFORMANCE",
      amount: "",
      month: getCurrentMonth(),
      reason: "",
      taxable: true,
    },
  });

  function handleOpenChange(next: boolean) {
    if (!next) form.reset();
    onOpenChange(next);
  }

  function handleTaxableChange(checked: boolean) {
    form.setValue("taxable", checked);
  }

  const handleSubmit = form.handleSubmit((values) => {
    createBonus.mutate(
      {
        userId: values.userId,
        type: values.type,
        amount: parseFloat(values.amount),
        month: values.month,
        reason: values.reason || undefined,
        taxable: values.taxable,
      },
      {
        onSuccess: () => {
          toast.success("Bonus created");
          form.reset();
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to create bonus"),
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Bonus</DialogTitle>
          <DialogDescription>
            Add a one-time bonus for an employee. Approved bonuses are included in the selected
            month&apos;s payroll run.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee</FormLabel>
                  <FormControl>
                    <UserCombobox
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select employee"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bonus Type</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CREATE_TYPE_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="month"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Payroll Month <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <MonthPicker value={field.value} onChange={field.onChange} yearRange={[-1, 1]} className="w-full" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief reason for this bonus" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="taxable"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center gap-3">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={handleTaxableChange}
                        id="taxable-switch"
                      />
                    </FormControl>
                    <Label htmlFor="taxable-switch" className="cursor-pointer text-sm font-medium">
                      Taxable
                    </Label>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createBonus.isPending}>
                {createBonus.isPending ? "Creating…" : "Create Bonus"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function BonusesTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);

  const month = searchParams.get("b_month") ?? getCurrentMonth();
  const type = searchParams.get("b_type") ?? "all";
  const status = searchParams.get("b_status") ?? "all";

  const { data, isLoading } = useBonuses();
  const updateBonus = useUpdateBonus();
  const canManage = useCan("hr:bonuses:manage");

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleMonthChange(value: string) {
    updateParam("b_month", value);
  }

  function handleTypeChange(value: string) {
    updateParam("b_type", value);
  }

  function handleStatusChange(value: string) {
    updateParam("b_status", value);
  }

  function handleOpenCreate() {
    setCreateOpen(true);
  }

  function makeApproveHandler(id: number) {
    function handleApprove() {
      updateBonus.mutate(
        { id, status: "APPROVED" },
        {
          onSuccess: () => toast.success("Bonus approved"),
          onError: () => toast.error("Failed to approve bonus"),
        },
      );
    }
    return handleApprove;
  }

  function makeRejectHandler(id: number) {
    function handleReject() {
      updateBonus.mutate(
        { id, status: "REJECTED" },
        {
          onSuccess: () => toast.success("Bonus rejected"),
          onError: () => toast.error("Failed to reject bonus"),
        },
      );
    }
    return handleReject;
  }

  const filtered = useMemo(
    () => (data ?? []).filter((b) => {
      const monthMatch = getBonusMonth(b) === month;
      const typeMatch = type === "all" || b.type === type;
      const statusMatch = status === "all" || b.status === status;
      return monthMatch && typeMatch && statusMatch;
    }),
    [data, month, type, status],
  );

  const actionColumn: DataTableColumn<Bonus> = {
    key: "actions",
    header: "",
    cell: (row) =>
      row.status === "PENDING" ? (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] px-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50 dark:text-emerald-300 dark:border-emerald-500/30 dark:hover:bg-emerald-500/10"
            disabled={updateBonus.isPending}
            onClick={makeApproveHandler(row.id)}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] px-2 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-500/30 dark:hover:bg-red-500/10"
            disabled={updateBonus.isPending}
            onClick={makeRejectHandler(row.id)}
          >
            Reject
          </Button>
        </div>
      ) : null,
  };

  const columns: DataTableColumn<Bonus>[] = [
    {
      key: "employee",
      header: "Employee",
      cell: (row) => (
        <div className="min-w-0">
          <TruncatedText text={row.userName ?? "Unknown user"} className="text-[11px] font-medium text-foreground max-w-[140px]" />
          {row.userEmail && (
            <TruncatedText text={row.userEmail} className="text-[10px] text-muted-foreground max-w-[140px]" />
          )}
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (row) => (
        <span
          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
            TYPE_COLORS[row.type] ?? "bg-muted text-muted-foreground border-border"
          }`}
        >
          {row.type.charAt(0) + row.type.slice(1).toLowerCase()}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      className: "text-right",
      cell: (row) => (
        <span className="font-mono text-[11px] tabular-nums">{formatMoney(row.amount)}</span>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      cell: (row) => (
        <TruncatedText text={row.reason ?? "—"} className="text-[10px] text-muted-foreground max-w-[160px]" />
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <BonusStatusBadge status={row.status} />,
    },
    {
      key: "submitted",
      header: "Submitted",
      cell: (row) => (
        <span className="text-[10px] text-muted-foreground">{formatDate(row.createdAt)}</span>
      ),
    },
    ...(canManage ? [actionColumn] : []),
  ];

  const filterBar = (
    <div className="flex items-center gap-2 flex-wrap mb-3">
      <MonthPicker value={month} onChange={handleMonthChange} yearRange={[-1, 0]} className="w-44" />
      <Select value={type} onValueChange={handleTypeChange}>
        <SelectTrigger className="text-sm w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TYPE_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={handleStatusChange}>
        <SelectTrigger className="text-sm w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {canManage && (
        <AnimatedIconButton icon={PlusIcon} iconClassName="mr-1.5" size="sm" className="ml-auto" onClick={handleOpenCreate}>
          Add Bonus
        </AnimatedIconButton>
      )}
    </div>
  );

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-0 pt-3">
      {filterBar}
      <Card className="flex min-h-0 min-w-0 flex-1 flex-col gap-0 overflow-hidden py-0">
        <CardContent className="flex min-h-0 min-w-0 flex-col overflow-hidden p-0">
          <DataTable
            data={filtered}
            columns={columns}
            getRowKey={(row) => row.id}
            isLoading={isLoading}
            minWidth="700px"
            emptyState={
              <EmptyState
                illustration={<EmptyReportIllustration />}
                title="No bonuses found"
                description="No bonuses match the current filters."
              />
            }
          />
        </CardContent>
      </Card>

      <CreateBonusDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
