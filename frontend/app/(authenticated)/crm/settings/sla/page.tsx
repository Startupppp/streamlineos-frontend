"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Trash2, Pencil, Clock, Shield, AlertTriangle,
  CheckCircle2, XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  useSlaPolicies, useSlaReport, useSlaBreachedLeads,
  useCreateSlaPolicy, useUpdateSlaPolicy, useDeleteSlaPolicy,
} from "@/hooks/api/crm-settings";
import { toast } from "sonner";

const PRIORITY_BADGE: Record<string, string> = {
  low: "bg-blue-50 text-blue-700 border-blue-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  urgent: "bg-red-50 text-red-700 border-red-200",
};

const policySchema = z.object({
  name: z.string().min(1, "Name required").max(100),
  appliesTo: z.enum(["lead", "deal", "both"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  firstResponseHours: z
    .string()
    .min(1, "Required")
    .refine((v) => !isNaN(Number(v)) && Number.isInteger(Number(v)) && Number(v) > 0, "Must be a positive integer"),
  resolutionHours: z
    .string()
    .min(1, "Required")
    .refine((v) => !isNaN(Number(v)) && Number.isInteger(Number(v)) && Number(v) > 0, "Must be a positive integer"),
});
type PolicyForm = z.infer<typeof policySchema>;

type SlaPolicyData = {
  id: number;
  name: string;
  appliesTo: string;
  priority: string;
  firstResponseHours: number;
  resolutionHours: number;
};

interface SlaTableRowProps {
  policy: SlaPolicyData;
  onEdit: (policy: SlaPolicyData) => void;
  onDeleteRequest: (id: number) => void;
}

function SlaTableRow({ policy, onEdit, onDeleteRequest }: SlaTableRowProps) {
  const handleEdit = useCallback(() => onEdit(policy), [policy, onEdit]);
  const handleDeleteRequest = useCallback(() => onDeleteRequest(policy.id), [policy.id, onDeleteRequest]);

  return (
    <TableRow className="h-8 hover:bg-muted/30 transition-colors">
      <TableCell className="text-[11px] px-2 py-1 font-medium">{policy.name}</TableCell>
      <TableCell className="text-[11px] px-2 py-1">
        <Badge variant="outline" className="text-[9px] h-4 px-1.5 py-0 bg-slate-100 text-slate-700 border-slate-200 capitalize">
          {policy.appliesTo}
        </Badge>
      </TableCell>
      <TableCell className="text-[11px] px-2 py-1">
        <Badge
          variant="outline"
          className={cn("text-[9px] h-4 px-1.5 py-0 capitalize", PRIORITY_BADGE[policy.priority] ?? PRIORITY_BADGE.medium)}
        >
          {policy.priority}
        </Badge>
      </TableCell>
      <TableCell className="text-[11px] px-2 py-1 text-right font-mono tabular-nums">{policy.firstResponseHours}h</TableCell>
      <TableCell className="text-[11px] px-2 py-1 text-right font-mono tabular-nums">{policy.resolutionHours}h</TableCell>
      <TableCell className="text-[11px] px-2 py-1 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleEdit} aria-label="Edit">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={handleDeleteRequest} aria-label="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function SlaPage() {
  const { data: policies, isLoading, isError, refetch } = useSlaPolicies();
  const { data: slaReport, isLoading: reportLoading } = useSlaReport();
  const { data: breachedLeads } = useSlaBreachedLeads({ limit: 10 });
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);

  const createPolicy = useCreateSlaPolicy();
  const updatePolicy = useUpdateSlaPolicy();
  const deletePolicy = useDeleteSlaPolicy();

  const createForm = useForm<PolicyForm>({
    resolver: zodResolver(policySchema),
    defaultValues: { name: "", appliesTo: "both", priority: "medium", firstResponseHours: "4", resolutionHours: "24" },
  });

  const editForm = useForm<PolicyForm>({
    resolver: zodResolver(policySchema),
  });

  const onCreateSubmit = useCallback((data: PolicyForm) => {
    createPolicy.mutate(
      {
        ...data,
        firstResponseHours: Number(data.firstResponseHours),
        resolutionHours: Number(data.resolutionHours),
      },
      {
        onSuccess: () => { toast.success("SLA policy created"); setCreateOpen(false); createForm.reset(); },
        onError: (err) => toast.error(err.message),
      }
    );
  }, [createPolicy, createForm]);

  const onEditSubmit = useCallback((data: PolicyForm) => {
    if (editingId === null) return;
    updatePolicy.mutate(
      {
        id: editingId,
        ...data,
        firstResponseHours: Number(data.firstResponseHours),
        resolutionHours: Number(data.resolutionHours),
      },
      {
        onSuccess: () => { toast.success("Policy updated"); setEditingId(null); },
        onError: (err) => toast.error(err.message),
      }
    );
  }, [editingId, updatePolicy]);

  const handleStartEdit = useCallback((policy: SlaPolicyData) => {
    setEditingId(policy.id);
    editForm.reset({
      name: policy.name,
      appliesTo: policy.appliesTo as PolicyForm["appliesTo"],
      priority: policy.priority as PolicyForm["priority"],
      firstResponseHours: String(policy.firstResponseHours),
      resolutionHours: String(policy.resolutionHours),
    });
  }, [editForm]);

  const handleCancelEdit = useCallback(() => setEditingId(null), []);
  const handleDeleteRequest = useCallback((id: number) => setDeleteTargetId(id), []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteTargetId === null) return;
    deletePolicy.mutate(deleteTargetId, {
      onSuccess: () => { toast.success("Policy deleted"); setDeleteTargetId(null); },
      onError: (err) => { toast.error(err.message); setDeleteTargetId(null); },
    });
  }, [deletePolicy, deleteTargetId]);

  const handleDeleteCancel = useCallback(() => setDeleteTargetId(null), []);
  const handleOpenCreate = useCallback(() => setCreateOpen(true), []);
  const handleRetry = useCallback(() => { void refetch(); }, [refetch]);
  const handleAlertOpenChange = useCallback((open: boolean) => { if (!open) handleDeleteCancel(); }, [handleDeleteCancel]);

  const count = policies?.length ?? 0;

  return (
    <>
      <AlertDialog open={deleteTargetId !== null} onOpenChange={handleAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete SLA Policy</AlertDialogTitle>
            <AlertDialogDescription>
              This policy will be permanently deleted. Leads and deals will no longer be tracked against it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PageWrapper
        title="SLA Policies"
        subtitle={isLoading ? undefined : `${count} polic${count !== 1 ? "ies" : "y"}`}
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Policy
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create SLA Policy</DialogTitle>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                  <FormField control={createForm.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Policy Name</FormLabel>
                      <FormControl><Input {...field} placeholder="e.g. Hot Lead SLA" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={createForm.control} name="appliesTo" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Applies To</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="lead">Lead</SelectItem>
                            <SelectItem value="deal">Deal</SelectItem>
                            <SelectItem value="both">Both</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={createForm.control} name="priority" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={createForm.control} name="firstResponseHours" render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Response (hrs)</FormLabel>
                        <FormControl><Input type="number" min={1} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={createForm.control} name="resolutionHours" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Resolution (hrs)</FormLabel>
                        <FormControl><Input type="number" min={1} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <Button type="submit" className="w-full" disabled={createPolicy.isPending}>
                    {createPolicy.isPending ? "Creating..." : "Create Policy"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        }
      >
        {isLoading || reportLoading ? (
          <div className="space-y-4">
            <div className="grid gap-2 grid-cols-2 lg:grid-cols-4">
              {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        ) : isError ? (
          <EmptyState
            illustration={<Shield className="h-8 w-8 text-muted-foreground/40" />}
            title="Failed to load SLA policies"
            description="Something went wrong. Please try again."
            action={{ label: "Retry", onClick: handleRetry }}
            className="flex-1 min-h-[40vh] border-0 bg-transparent"
          />
        ) : (
          <div className="space-y-6">
            {slaReport && (
              <StatCardGrid cols={4}>
                <StatCard label="Total with SLA" value={slaReport.total} icon={Shield} tone="blue" />
                <StatCard label="Compliant" value={slaReport.compliant} icon={CheckCircle2} tone="emerald" />
                <StatCard label="Breached" value={slaReport.breached} icon={XCircle} tone="red" />
                <StatCard
                  label="Compliance Rate"
                  value={`${slaReport.complianceRate}%`}
                  icon={Clock}
                  tone={slaReport.complianceRate >= 80 ? "emerald" : slaReport.complianceRate >= 50 ? "amber" : "red"}
                />
              </StatCardGrid>
            )}

            <Card className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
              <CardHeader className="px-4 py-3">
                <CardTitle className="text-sm font-semibold">Policies</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {policies && policies.length > 0 ? (
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                      <TableRow className="border-b-2 border-border hover:bg-transparent">
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Name</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Applies To</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Priority</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">First Response</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Resolution</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {policies.map(policy => (
                        <SlaTableRow
                          key={policy.id}
                          policy={policy}
                          onEdit={handleStartEdit}
                          onDeleteRequest={handleDeleteRequest}
                        />
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-14 px-4">
                    <EmptyState
                      illustration={<Shield className="h-8 w-8 text-muted-foreground/40" />}
                      title="No SLA policies defined"
                      description="Create a policy to track response and resolution time commitments."
                      action={{ label: "New Policy", onClick: handleOpenCreate }}
                      className="border-0 bg-transparent"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {editingId !== null && (
              <Card className="bg-card rounded-lg border border-border shadow-sm">
                <CardHeader className="px-4 py-3">
                  <CardTitle className="text-sm font-semibold">Edit Policy</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <Form {...editForm}>
                    <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                      <FormField control={editForm.control} name="name" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Policy Name</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField control={editForm.control} name="appliesTo" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Applies To</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="lead">Lead</SelectItem>
                                <SelectItem value="deal">Deal</SelectItem>
                                <SelectItem value="both">Both</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={editForm.control} name="priority" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="medium">Medium</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={editForm.control} name="firstResponseHours" render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Response (hrs)</FormLabel>
                            <FormControl><Input type="number" min={1} {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={editForm.control} name="resolutionHours" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Resolution (hrs)</FormLabel>
                            <FormControl><Input type="number" min={1} {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                        <Button type="submit" disabled={updatePolicy.isPending}>
                          {updatePolicy.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            )}

            {breachedLeads && breachedLeads.length > 0 && (
              <Card className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
                <CardHeader className="px-4 py-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    SLA Breached Leads ({breachedLeads.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                      <TableRow className="border-b-2 border-border hover:bg-transparent">
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Lead</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Status</TableHead>
                        <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Breached Since</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {breachedLeads.map(lead => (
                        <TableRow key={lead.id} className="h-8 hover:bg-muted/30 transition-colors">
                          <TableCell className="text-[11px] px-2 py-1 font-medium">{lead.name}</TableCell>
                          <TableCell className="text-[11px] px-2 py-1">
                            <Badge variant="outline" className="text-[9px] h-4 px-1.5 py-0 bg-slate-100 text-slate-700 border-slate-200">
                              {lead.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[11px] px-2 py-1 text-right text-red-700 font-mono tabular-nums">
                            {lead.slaDeadline ? new Date(lead.slaDeadline).toLocaleDateString() : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </PageWrapper>
    </>
  );
}
