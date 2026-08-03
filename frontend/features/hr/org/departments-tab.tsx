"use client";

import { useState, useCallback, useMemo } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useHrDepartments, useCreateDepartment } from "@/hooks/api/hr/employees";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Building2 } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { EmptyState } from "@/components/ui/empty-state";
import { EntityFormSheet } from "@/components/shared/entity-form-sheet";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { TruncatedText } from "@/components/ui/truncated-text";

interface Props {
  canManage: boolean;
}

const departmentFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters")
    .refine((v) => !/\s{2,}/.test(v), "Name cannot have consecutive spaces")
    .refine((v) => /[a-zA-Z]/.test(v), "Name must contain at least one letter")
    .refine(
      (v) => !/[^\p{L}\p{N}\s]{2,}/u.test(v),
      "Name cannot have consecutive special characters",
    ),
});

type DepartmentFormValues = z.infer<typeof departmentFormSchema>;

export function DepartmentsTab({ canManage }: Props) {
  const { data: departments, isLoading } = useHrDepartments();
  const createMutation = useCreateDepartment();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const handleSearch = useCallback((value: string) => setSearch(value), []);
  const handleCreate = useCallback(() => setCreateOpen(true), []);
  const defaultValues = useMemo(() => ({ name: "" }), []);

  async function handleSubmit(values: DepartmentFormValues) {
    try {
      await createMutation.mutateAsync({
        name: values.name.replace(/\s+/g, " ").trim(),
      });
      toast.success("Department created");
      setCreateOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const filtered = (departments ?? []).filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-3">
        <SearchInput
          value={search}
          onValueChange={handleSearch}
          placeholder="Search departments..."
        />
        {canManage && (
          <AnimatedIconButton
            size="sm"
            className="gap-1.5"
            onClick={handleCreate}
            icon={PlusIcon}
            iconSize={14}
            iconClassName="mr-1.5"
          >
            Add Department
          </AnimatedIconButton>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          illustrationPreset="companies"
          title="No departments found"
          description={
            search
              ? "Try a different search term."
              : "Create your first department to structure the organization."
          }
          action={
            canManage
              ? { label: "Add department", onClick: handleCreate }
              : undefined
          }
          compact
        />
      ) : (
        <Card className="rounded-2xl border border-border/70 bg-card/90 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_28px_-14px_rgba(15,23,42,0.12)] overflow-hidden">
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {filtered.map((dept) => (
                <div
                  key={dept.id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors"
                >
                  <div className="w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <TruncatedText text={dept.name} className="text-sm font-medium flex-1" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <EntityFormSheet<DepartmentFormValues>
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New Department"
        description="Add a department to structure your organisation."
        resolver={zodResolver(departmentFormSchema)}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        isSubmitting={createMutation.isPending}
        submitLabel="Create"
        className="sm:max-w-md"
        resetOnOpen
      >
        {(form) => (
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Department name" autoFocus {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </EntityFormSheet>
    </>
  );
}
