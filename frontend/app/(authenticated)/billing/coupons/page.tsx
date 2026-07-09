"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, isAfter, addDays } from "date-fns";
import { Plus, Copy, MoreHorizontal, RefreshCw, Tag, CheckCircle2, TrendingUp, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyDocumentsIllustration } from "@/components/illustrations";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCan } from "@/hooks/api/access";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import {
  useCoupons,
  useCreateCoupon,
  useUpdateCoupon,
  type Coupon,
  type CreateCouponInput,
} from "@/hooks/api/coupons";

const PLAN_OPTIONS = ["STARTER", "PROFESSIONAL", "ENTERPRISE"] as const;

const createCouponSchema = z.object({
  code: z.string().min(1, "Code is required").max(50),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  value: z.number({ error: "Enter a valid number" }).positive("Must be positive"),
  maxUses: z.number().int().positive().optional(),
  applicablePlans: z.array(z.string()).optional(),
  expiresAt: z.string().optional(),
});

type CreateCouponValues = z.infer<typeof createCouponSchema>;

function getCouponStatus(coupon: Coupon): "Active" | "Inactive" | "Expired" {
  if (!coupon.isActive) return "Inactive";
  if (coupon.expiresAt && !isAfter(new Date(coupon.expiresAt), new Date())) {
    return "Expired";
  }
  return "Active";
}

const STATUS_CLASSES: Record<"Active" | "Inactive" | "Expired", string> = {
  Active: "bg-green-500/10 text-green-600 border-green-500/20",
  Inactive: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  Expired: "bg-red-500/10 text-red-600 border-red-500/20",
};

function TableSkeleton() {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="border-b border-border px-4 py-3 bg-muted/30">
        <div className="grid grid-cols-7 gap-3">
          {["Code", "Type", "Value", "Usage", "Plans", "Expires", "Status"].map(
            (h) => (
              <Skeleton key={h} className="h-3 w-full" />
            ),
          )}
        </div>
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="px-4 py-3 border-b border-border last:border-0">
          <div className="grid grid-cols-7 gap-3">
            {Array.from({ length: 7 }).map((__, j) => (
              <Skeleton key={j} className="h-4 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface CreateCouponSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CreateCouponSheet({ open, onOpenChange }: CreateCouponSheetProps) {
  const createCoupon = useCreateCoupon();

  const form = useForm<CreateCouponValues>({
    resolver: zodResolver(createCouponSchema),
    defaultValues: {
      code: "",
      type: "PERCENTAGE",
      value: undefined,
      maxUses: undefined,
      applicablePlans: [],
      expiresAt: "",
    },
  });

  const selectedPlans = form.watch("applicablePlans") ?? [];

  function handleOpenChange(next: boolean) {
    if (!next) form.reset();
    onOpenChange(next);
  }

  function handlePlanToggle(plan: string) {
    const current = form.getValues("applicablePlans") ?? [];
    const next = current.includes(plan)
      ? current.filter((p) => p !== plan)
      : [...current, plan];
    form.setValue("applicablePlans", next);
  }

  function handleSubmit(values: CreateCouponValues) {
    const payload: CreateCouponInput = {
      code: values.code.toUpperCase(),
      type: values.type,
      value: values.value,
      ...(values.maxUses !== undefined && { maxUses: values.maxUses }),
      ...(values.applicablePlans && values.applicablePlans.length > 0 && {
        applicablePlans: values.applicablePlans,
      }),
      ...(values.expiresAt && values.expiresAt.length > 0 && {
        expiresAt: values.expiresAt,
      }),
    };

    createCoupon.mutate(payload, {
      onSuccess: () => {
        form.reset();
        onOpenChange(false);
      },
    });
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col gap-0">
        <SheetHeader className="shrink-0 px-6 py-4 border-b text-left gap-1">
          <SheetTitle>Create Coupon</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-6 py-5">
        <Form {...form}>
          <form
            id="create-coupon-form"
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col gap-4"
          >
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coupon Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="SUMMER25"
                      {...field}
                      onChange={(e) =>
                        field.onChange(e.target.value.toUpperCase())
                      }
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
                  <FormLabel>Discount Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                      <SelectItem value="FIXED">Fixed Amount (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {form.watch("type") === "PERCENTAGE"
                      ? "Discount (%)"
                      : "Discount Amount (₹)"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder={
                        form.watch("type") === "PERCENTAGE" ? "25" : "500"
                      }
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxUses"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Uses (optional — blank for unlimited)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      placeholder="100"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Applicable Plans (optional — leave blank for all)</FormLabel>
              <div className="flex gap-2 flex-wrap">
                {PLAN_OPTIONS.map((plan) => (
                  <button
                    key={plan}
                    type="button"
                    onClick={() => handlePlanToggle(plan)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      selectedPlans.includes(plan)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {plan}
                  </button>
                ))}
              </div>
            </FormItem>

            <FormField
              control={form.control}
              name="expiresAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expires At (optional)</FormLabel>
                  <FormControl>
                    <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="h-8 text-sm" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

          </form>
        </Form>
        </div>
        <SheetFooter className="shrink-0 px-6 py-4 border-t flex-row gap-2 justify-end">
          <Button
            type="submit"
            form="create-coupon-form"
            disabled={createCoupon.isPending}
            className="w-full"
          >
            {createCoupon.isPending ? "Creating..." : "Create Coupon"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default function CouponsPage() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const canManage = useCan("settings:manage");
  const { data, isLoading, isError, refetch } = useCoupons();
  const updateCoupon = useUpdateCoupon();

  const coupons = data?.coupons ?? [];
  const now = new Date();
  const sevenDaysOut = addDays(now, 7);

  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter((c) => {
    if (!c.isActive) return false;
    if (c.expiresAt && !isAfter(new Date(c.expiresAt), now)) return false;
    return true;
  }).length;
  const totalRedemptions = coupons.reduce((sum, c) => sum + c.usedCount, 0);
  const comingDue = coupons.filter(
    (c) =>
      c.isActive &&
      c.expiresAt &&
      isAfter(new Date(c.expiresAt), now) &&
      !isAfter(new Date(c.expiresAt), sevenDaysOut),
  ).length;

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);

  function handleCopyCode(code: string) {
    void navigator.clipboard.writeText(code);
    toast.success("Code copied");
  }

  function handleToggleActive(coupon: Coupon) {
    updateCoupon.mutate({ id: coupon.id, data: { isActive: !coupon.isActive } });
  }

  function handleRetry() {
    void refetch();
  }

  if (!canManage) {
    return (
      <PageWrapper title="Coupons & Promotions" subtitle="Create and manage discount codes">
        <div className="flex flex-col items-center justify-center flex-1 py-16 gap-2">
          <Tag className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">Access restricted</p>
          <p className="text-xs text-muted-foreground">
            You don&apos;t have permission to manage coupons.
          </p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <>
      <PageWrapper
        title="Coupons & Promotions"
        subtitle="Create and manage discount codes"
        actions={
          <Button size="sm" onClick={handleOpenSheet}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Create Coupon
          </Button>
        }
      >
        <div className="space-y-4">
          <StatCardGrid cols={4}>
            <StatCard label="Total Coupons" value={totalCoupons} icon={Tag} tone="default" />
            <StatCard label="Active" value={activeCoupons} icon={CheckCircle2} tone="emerald" />
            <StatCard
              label="Total Redemptions"
              value={totalRedemptions}
              icon={TrendingUp}
              tone="blue"
              hint={totalCoupons > 0 ? `avg ${(totalRedemptions / totalCoupons).toFixed(1)}/coupon` : undefined}
            />
            <StatCard label="Expiring in 7 days" value={comingDue} icon={Clock} tone="amber" />
          </StatCardGrid>

          {isLoading ? (
            <TableSkeleton />
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <p className="text-sm text-muted-foreground">
                Failed to load coupons
              </p>
              <Button variant="outline" size="sm" onClick={handleRetry}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Retry
              </Button>
            </div>
          ) : coupons.length === 0 ? (
            <EmptyState
              illustration={<EmptyDocumentsIllustration />}
              title="No coupons yet"
              description="Create discount codes to offer promotions to your customers."
              action={{ label: "Create Coupon", onClick: handleOpenSheet }}
            />
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border">
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Code</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Type</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Value</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Usage</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Plans</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Expires</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2">Status</TableHead>
                      <TableHead className="w-10 px-3 py-2" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coupons.map((coupon) => {
                      const status = getCouponStatus(coupon);
                      return (
                        <TableRow key={coupon.id} className="border-b border-border/50 hover:bg-muted/30">
                          <TableCell className="font-mono text-xs font-medium">
                            {coupon.code}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {coupon.type === "PERCENTAGE"
                              ? "Percentage"
                              : "Fixed"}
                          </TableCell>
                          <TableCell className="text-xs tabular-nums">
                            {coupon.type === "PERCENTAGE"
                              ? `${coupon.value}%`
                              : `₹${Number(coupon.value).toLocaleString("en-IN")}`}
                          </TableCell>
                          <TableCell className="text-xs tabular-nums text-muted-foreground">
                            {coupon.usedCount}
                            {coupon.maxUses !== null
                              ? ` / ${coupon.maxUses}`
                              : " / ∞"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {coupon.applicablePlans &&
                            coupon.applicablePlans.length > 0 ? (
                              <span className="text-muted-foreground">
                                {coupon.applicablePlans.join(", ")}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60">
                                All
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground tabular-nums">
                            {coupon.expiresAt
                              ? format(new Date(coupon.expiresAt), "dd MMM yyyy")
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border ${STATUS_CLASSES[status]}`}
                            >
                              {status}
                            </span>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                >
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleCopyCode(coupon.code)}
                                >
                                  <Copy className="h-3.5 w-3.5 mr-2" />
                                  Copy code
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleToggleActive(coupon)}
                                  disabled={updateCoupon.isPending}
                                >
                                  {coupon.isActive ? "Deactivate" : "Reactivate"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      </PageWrapper>

      <CreateCouponSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}
