"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Settings2, Trash2, Pencil, Clock, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/lib/api/hooks/access";
import {
  useLeavePolicies,
  useCreateLeavePolicy,
  useUpdateLeavePolicy,
  useDeleteLeavePolicy,
  type LeavePolicy,
} from "@/hooks/api/hr/leave-policies";

const policySchema = z.object({
  name: z.string().min(1, "Name is required"),
  leaveTypeId: z.string().min(1, "Leave type ID is required"),
  accrualType: z.enum(["ANNUAL", "MONTHLY", "DAILY"]),
  accrualRate: z.string().min(1, "Accrual rate is required"),
  maxBalance: z.string().optional(),
  carryForwardDays: z.string().default("0"),
  encashable: z.boolean().default(false),
  probationRestricted: z.boolean().default(false),
  effectiveFrom: z.string().min(1, "Effective date is required"),
});

type PolicyFormValues = z.infer<typeof policySchema>;

const ACCRUAL_LABELS: Record<string, string> = {
  ANNUAL: "days/year",
  MONTHLY: "days/month",
  DAILY: "days/day",
};

function PolicyCard({
  policy,
  index,
  canManage,
  onEdit,
  onDelete,
}: {
  policy: LeavePolicy;
  index: number;
  canManage: boolean;
  onEdit: (policy: LeavePolicy) => void;
  onDelete: (id: number) => void;
}) {
  function handleEditClick() {
    onEdit(policy);
  }
  function handleDeleteClick() {
    onDelete(policy.id);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut", delay: index * 0.08 }}
      className="bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60 p-5 flex flex-col gap-3 hover:shadow-2xl transition-shadow duration-200"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">{policy.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">Leave Type #{policy.leaveTypeId}</p>
        </div>
        {canManage && (
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleEditClick}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={handleDeleteClick}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-700">
        <Clock className="h-4 w-4 text-violet-500 shrink-0" />
        <span>
          {policy.accrualRate} {ACCRUAL_LABELS[policy.accrualType] ?? "days"}
        </span>
      </div>

      {Number(policy.carryForwardDays) > 0 && (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Calendar className="h-4 w-4 text-indigo-400 shrink-0" />
          <span>Carry forward: {policy.carryForwardDays} days</span>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mt-1">
        {policy.encashable && (
          <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">
            Encashable
          </Badge>
        )}
        {policy.probationRestricted && (
          <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
            Probation Restricted
          </Badge>
        )}
        <Badge variant="outline" className="text-xs">
          {policy.accrualType}
        </Badge>
      </div>

      <p className="text-xs text-slate-400 mt-auto pt-2 border-t border-slate-100">
        Effective from {policy.effectiveFrom}
      </p>
    </motion.div>
  );
}

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="flex-1 flex flex-col items-center justify-center text-center py-24"
    >
      <div className="bg-violet-50 rounded-2xl p-5 mb-4">
        <Settings2 className="h-10 w-10 text-violet-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900">No leave policies yet</h3>
      <p className="text-slate-500 text-sm mt-1 max-w-xs">
        Define accrual rules and carry-forward policies for each leave type.
      </p>
      <Button
        className="mt-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
        onClick={onCreateClick}
      >
        <Plus className="h-4 w-4 mr-2" /> Create Policy
      </Button>
    </motion.div>
  );
}

export default function LeavePoliciesPage() {
  const { data: policies, isLoading } = useLeavePolicies();
  const createMutation = useCreateLeavePolicy();
  const updateMutation = useUpdateLeavePolicy();
  const deleteMutation = useDeleteLeavePolicy();
  const canManage = useCan("hr:leaves:manage");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<LeavePolicy | null>(null);

  const form = useForm<PolicyFormValues>({
    resolver: zodResolver(policySchema),
    defaultValues: {
      accrualType: "ANNUAL",
      carryForwardDays: "0",
      encashable: false,
      probationRestricted: false,
      name: "",
      leaveTypeId: "",
      accrualRate: "",
      maxBalance: "",
      effectiveFrom: "",
    },
  });

  function handleCreateClick() {
    setEditingPolicy(null);
    form.reset({
      accrualType: "ANNUAL",
      carryForwardDays: "0",
      encashable: false,
      probationRestricted: false,
      name: "",
      leaveTypeId: "",
      accrualRate: "",
      maxBalance: "",
      effectiveFrom: "",
    });
    setSheetOpen(true);
  }

  function handleEditClick(policy: LeavePolicy) {
    setEditingPolicy(policy);
    form.reset({
      name: policy.name,
      leaveTypeId: String(policy.leaveTypeId),
      accrualType: policy.accrualType as "ANNUAL" | "MONTHLY" | "DAILY",
      accrualRate: policy.accrualRate,
      maxBalance: policy.maxBalance ?? "",
      carryForwardDays: policy.carryForwardDays,
      encashable: policy.encashable,
      probationRestricted: policy.probationRestricted,
      effectiveFrom: policy.effectiveFrom,
    });
    setSheetOpen(true);
  }

  function handleDeleteClick(id: number) {
    deleteMutation.mutate(id, {
      onSuccess: () => toast.success("Policy deleted"),
      onError: () => toast.error("Failed to delete policy"),
    });
  }

  function handleSheetOpenChange(open: boolean) {
    if (!open) {
      setSheetOpen(false);
      setEditingPolicy(null);
    }
  }

  function handleFormSubmit(values: PolicyFormValues) {
    const payload = { ...values, leaveTypeId: parseInt(values.leaveTypeId, 10) };

    if (editingPolicy) {
      updateMutation.mutate(
        { id: editingPolicy.id, ...payload },
        {
          onSuccess: () => {
            toast.success("Policy updated");
            setSheetOpen(false);
            setEditingPolicy(null);
          },
          onError: () => toast.error("Failed to update policy"),
        },
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast.success("Policy created");
          setSheetOpen(false);
          form.reset();
        },
        onError: () => toast.error("Failed to create policy"),
      });
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/40">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Leave Policies</h1>
            <p className="text-sm text-slate-500 mt-0.5">Define accrual and carry-forward rules per leave type</p>
          </div>
          {canManage && (
            <Button
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
              onClick={handleCreateClick}
            >
              <Plus className="h-4 w-4 mr-2" /> New Policy
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-52 rounded-2xl" />
            ))}
          </div>
        ) : !policies?.length ? (
          <EmptyState onCreateClick={handleCreateClick} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {policies.map((policy, i) => (
              <PolicyCard
                key={policy.id}
                policy={policy}
                index={i}
                canManage={canManage}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
        )}
      </div>

      <Sheet open={sheetOpen} onOpenChange={handleSheetOpenChange}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingPolicy ? "Edit Policy" : "New Leave Policy"}</SheetTitle>
          </SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Policy Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Annual Leave Policy" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="leaveTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Leave Type ID</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="accrualType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Accrual Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ANNUAL">Annual</SelectItem>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                        <SelectItem value="DAILY">Daily</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="accrualRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Accrual Rate (days)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.5" placeholder="12" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxBalance"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Balance</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.5" placeholder="Unlimited" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="carryForwardDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carry Forward Days</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.5" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="effectiveFrom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Effective From</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="encashable"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 rounded-lg border p-3">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div>
                      <FormLabel className="font-medium cursor-pointer">Encashable</FormLabel>
                      <p className="text-xs text-slate-500">Allow leave balance encashment</p>
                    </div>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="probationRestricted"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3 rounded-lg border p-3">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div>
                      <FormLabel className="font-medium cursor-pointer">Probation Restricted</FormLabel>
                      <p className="text-xs text-slate-500">Restrict during probation period</p>
                    </div>
                  </FormItem>
                )}
              />
              <SheetFooter className="pt-4">
                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md"
                >
                  {isPending ? "Saving..." : editingPolicy ? "Update Policy" : "Create Policy"}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
