"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Trash2, Pencil, Clock, Shield, AlertTriangle,
  CheckCircle2, XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
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
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  useSlaPolicies, useSlaReport, useSlaBreachedLeads,
  useCreateSlaPolicy, useUpdateSlaPolicy, useDeleteSlaPolicy,
} from "@/lib/api/hooks/crm-settings";
import { toast } from "sonner";

const PRIORITY_COLORS: Record<string, { color: string; bg: string }> = {
  low: { color: "text-blue-400", bg: "bg-blue-500/15" },
  medium: { color: "text-amber-400", bg: "bg-amber-500/15" },
  high: { color: "text-orange-400", bg: "bg-orange-500/15" },
  urgent: { color: "text-red-400", bg: "bg-red-500/15" },
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

  const handleStartEdit = useCallback((policy: {
    id: number;
    name: string;
    appliesTo: string;
    priority: string;
    firstResponseHours: number;
    resolutionHours: number;
  }) => {
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

  const handleDeleteRequest = useCallback((id: number) => {
    setDeleteTargetId(id);
  }, []);

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

  if (isLoading || reportLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <EmptyState
          illustration={<Shield className="h-10 w-10 text-muted-foreground" />}
          title="Failed to load SLA policies"
          description="Something went wrong. Please try again."
          action={{ label: "Retry", onClick: () => refetch() }}
        />
      </div>
    );
  }

  return (
    <>
      <AlertDialog open={deleteTargetId !== null} onOpenChange={(open) => { if (!open) handleDeleteCancel(); }}>
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
        subtitle="Service Level Agreement policies for leads and deals"
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
        <motion.div
          className="space-y-6"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {slaReport && (
            <motion.div variants={fadeUp} className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <StatCard label="Total with SLA" value={slaReport.total} icon={Shield} color="blue" index={0} />
              <StatCard label="Compliant" value={slaReport.compliant} icon={CheckCircle2} color="green" index={1} />
              <StatCard label="Breached" value={slaReport.breached} icon={XCircle} color="red" index={2} />
              <StatCard
                label="Compliance Rate"
                value={`${slaReport.complianceRate}%`}
                icon={Clock}
                color={slaReport.complianceRate >= 80 ? "green" : slaReport.complianceRate >= 50 ? "amber" : "red"}
                index={3}
              />
            </motion.div>
          )}

          <motion.div variants={fadeUp}>
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Policies</CardTitle>
              </CardHeader>
              <CardContent>
                {policies && policies.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Name</TableHead>
                        <TableHead className="text-xs">Applies To</TableHead>
                        <TableHead className="text-xs">Priority</TableHead>
                        <TableHead className="text-xs text-right">First Response</TableHead>
                        <TableHead className="text-xs text-right">Resolution</TableHead>
                        <TableHead className="text-xs text-right">Actions</TableHead>
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
                  <div className="py-14">
                    <EmptyState
                      illustration={<Shield className="h-10 w-10 text-muted-foreground" />}
                      title="No SLA policies defined"
                      description="Create a policy to track response and resolution time commitments."
                      action={{ label: "New Policy", onClick: handleOpenCreate }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {editingId !== null && (
            <motion.div variants={fadeUp}>
              <Card className="shadow-sm border-blue-500/30">
                <CardHeader>
                  <CardTitle className="text-base">Edit Policy</CardTitle>
                </CardHeader>
                <CardContent>
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
            </motion.div>
          )}

          {breachedLeads && breachedLeads.length > 0 && (
            <motion.div variants={fadeUp}>
              <Card className="shadow-sm border-red-500/20">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    SLA Breached Leads ({breachedLeads.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Lead</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs text-right">Breached Since</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {breachedLeads.map(lead => (
                        <TableRow key={lead.id}>
                          <TableCell className="text-xs font-medium">{lead.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-[10px]">{lead.status}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-right text-red-400">
                            {lead.slaDeadline ? new Date(lead.slaDeadline).toLocaleDateString() : "N/A"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </PageWrapper>
    </>
  );
}

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
  const pColor = PRIORITY_COLORS[policy.priority] ?? PRIORITY_COLORS.medium;
  const handleEdit = useCallback(() => onEdit(policy), [policy, onEdit]);
  const handleDeleteRequest = useCallback(() => onDeleteRequest(policy.id), [policy.id, onDeleteRequest]);

  return (
    <TableRow>
      <TableCell className="text-xs font-medium">{policy.name}</TableCell>
      <TableCell>
        <Badge variant="secondary" className="text-[10px] capitalize">{policy.appliesTo}</Badge>
      </TableCell>
      <TableCell>
        <Badge className={cn("text-[10px] capitalize", pColor.bg, pColor.color)}>{policy.priority}</Badge>
      </TableCell>
      <TableCell className="text-xs text-right">{policy.firstResponseHours}h</TableCell>
      <TableCell className="text-xs text-right">{policy.resolutionHours}h</TableCell>
      <TableCell className="text-right">
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
