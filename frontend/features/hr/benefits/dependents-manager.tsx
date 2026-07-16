"use client";

import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { UserRound } from "lucide-react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { PlusIcon, Trash2Icon } from "@animateicons/react/lucide";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { HrSheet } from "@/features/hr/hr-sheet";
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

const depSchema = z.object({
  name: z.string().min(1, "Name is required"),
  relationship: z.enum(["spouse", "child", "parent", "other"]),
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
        <div className="w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
          <UserRound className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">{dep.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge variant="outline" className="text-[10px]">
              {dep.relationship}
            </Badge>
            {dep.dateOfBirth && (
              <span className="text-xs text-muted-foreground">{dep.dateOfBirth}</span>
            )}
          </div>
        </div>
      </div>
      <AnimatedIconButton size="icon" variant="ghost" className="w-7 text-muted-foreground hover:text-destructive" onClick={onDelete} icon={Trash2Icon} iconSize={14} />
    </div>
  );
}

export function DependentsManager() {
  const { data: dependents, isLoading } = useDependents();
  const addDependent = useAddDependent();
  const deleteDependent = useDeleteDependent();
  const [sheetOpen, setSheetOpen] = useState(false);

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

  const handleDelete = useCallback(
    (id: number) => {
      toast.promise(deleteDependent.mutateAsync(id), {
        loading: "Removing dependent...",
        success: "Dependent removed",
        error: (e: unknown) => getErrorMessage(e),
      });
    },
    [deleteDependent],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Dependents</p>
        <AnimatedIconButton size="sm" variant="outline" className="text-xs gap-1" onClick={handleOpenSheet} icon={PlusIcon} iconSize={12} iconClassName="mr-1">
          Add
        </AnimatedIconButton>
      </div>

      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !dependents?.length ? (
            <p className="text-sm text-muted-foreground text-center py-4">No dependents added yet</p>
          ) : (
            <div>
              {dependents.map((dep) => (
                <DependentRow key={dep.id} dep={dep} onDelete={() => handleDelete(dep.id)} />
              ))}
            </div>
          )}
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
            onValueChange={(v) => form.setValue("relationship", v as DepFormValues["relationship"])}
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
    </div>
  );
}
