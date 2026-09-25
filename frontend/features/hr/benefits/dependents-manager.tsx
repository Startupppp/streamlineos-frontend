"use client";

import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { UserRound } from "lucide-react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { HrSheet } from "@/components/shared/hr-sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useDependents,
  useAddDependent,
  useDeleteDependent,
  type Dependent,
} from "@/hooks/api/hr";
import { getErrorMessage } from "@/lib/get-error-message";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";

const DEPENDENT_RELATIONSHIPS = ["spouse", "child", "parent", "other"] as const;

const depSchema = z.object({
  name: z.string().min(1, "Name is required"),
  relationship: z.enum(DEPENDENT_RELATIONSHIPS),
  dateOfBirth: z.string().optional(),
});

type DepFormValues = z.infer<typeof depSchema>;

const RELATIONSHIPS = [
  { value: "spouse", label: "Spouse" },
  { value: "child", label: "Child" },
  { value: "parent", label: "Parent" },
  { value: "other", label: "Other" },
] as const;

function DependentRow({ dep, onDelete }: { dep: Dependent; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
          <UserRound className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">{dep.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge variant="outline" className="text-micro">
              {dep.relationship}
            </Badge>
            {dep.dateOfBirth && (
              <span className="text-xs text-muted-foreground">{dep.dateOfBirth}</span>
            )}
          </div>
        </div>
      </div>
      <TooltipIconButton
        variant="ghost"
        className="w-7 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
        icon={Trash2Icon}
        iconSize={14}
        label={`Delete ${dep.name}`}
      />
    </div>
  );
}

export function DependentsManager() {
  const { data: dependents, isLoading, isError, error, refetch } = useDependents();
  const addDependent = useAddDependent();
  const deleteDependent = useDeleteDependent();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Dependent | null>(null);
  const pageState = usePageState({ permission: "hr:benefits:view", module: "hr", isLoading, isError, error });

  const form = useForm<DepFormValues>({
    resolver: zodResolver(depSchema),
    defaultValues: { name: "", relationship: "spouse", dateOfBirth: "" },
  });

  const handleOpenSheet = useCallback(() => setSheetOpen(true), []);

  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      if (!open) form.reset();
      setSheetOpen(open);
    },
    [form],
  );

  const handleSubmit = useCallback(() => {
    void form.handleSubmit((values) => {
      toast.promise(
        addDependent.mutateAsync({
          name: values.name,
          relationship: values.relationship,
          dateOfBirth: values.dateOfBirth || undefined,
        }),
        {
          loading: "Adding dependent...",
          success: () => {
            setSheetOpen(false);
            form.reset();
            return "Dependent added";
          },
          error: (e: unknown) => getErrorMessage(e),
        },
      );
    })();
  }, [form, addDependent]);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteDependent.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`Removed ${deleteTarget.name}`);
        setDeleteTarget(null);
      },
      onError: (e: unknown) => toast.error(getErrorMessage(e)),
    });
  }, [deleteDependent, deleteTarget]);
  const handleDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);
  function handleRetry() { void refetch(); }

  function handleRelationshipChange(v: string) {
    const next = DEPENDENT_RELATIONSHIPS.find((candidate) => candidate === v);
    if (next) form.setValue("relationship", next);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Dependents</p>
        <AnimatedIconButton size="sm" variant="outline" className="text-xs gap-1" onClick={handleOpenSheet} icon={PlusIcon} iconSize={12} iconClassName="mr-1">
          Add dependent
        </AnimatedIconButton>
      </div>

      <Card>
        <CardContent className="p-4">
          <PageState
            resolution={pageState}
            loading={
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            }
            onRetry={handleRetry}
          >
          {!dependents?.length ? (
            <EmptyState
              illustrationPreset="team"
              illustrationSize="sm"
              title="No dependents added yet"
              description="Add family members who should be covered under your benefits."
              compact
              className="py-6 border-0 bg-transparent rounded-none"
            />
          ) : (
            <div>
              {dependents.map((dep) => (
                <DependentRow key={dep.id} dep={dep} onDelete={() => setDeleteTarget(dep)} />
              ))}
            </div>
          )}
          </PageState>
        </CardContent>
      </Card>

      <HrSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        title="Add Dependent"
        description="Add a family member as a dependent"
        onSubmit={handleSubmit}
        submitLabel="Add Dependent"
        isPending={addDependent.isPending}
      >
        <div className="space-y-1.5">
          <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
          <Input id="name" placeholder="Jane Doe" {...form.register("name")} />
          {form.formState.errors.name && (
            <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Relationship <span className="text-destructive">*</span></Label>
          <Select
            defaultValue="spouse"
            onValueChange={handleRelationshipChange}
          >
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RELATIONSHIPS.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <Input id="dateOfBirth" type="date" {...form.register("dateOfBirth")} />
        </div>
      </HrSheet>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={handleDeleteOpenChange}
        title="Remove dependent?"
        description={deleteTarget ? `${deleteTarget.name} will no longer be covered under your benefits.` : ""}
        confirmLabel="Remove"
        destructive
        isPending={deleteDependent.isPending}
        keepOpenOnConfirm
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
