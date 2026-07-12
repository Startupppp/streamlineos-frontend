"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useController } from "react-hook-form";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EntityFormDialog } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useCreateDimension,
  useUpdateDimension,
  type AccountingDimension,
} from "@/hooks/api/accounting/core";

const ACCOUNT_TYPES = [
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "INCOME",
  "EXPENSE",
] as const;

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  key: z
    .string()
    .min(1, "Key is required")
    .max(50)
    .regex(/^[a-z][a-z0-9_-]*$/, "Lowercase letters, digits, hyphens, or underscores only"),
  requiredForAccountTypes: z.array(z.string()),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dimension?: AccountingDimension;
}

function AccountTypeToggle({
  name,
  disabled,
}: {
  name: string;
  disabled: boolean;
}) {
  const { field } = useController<FormValues>({ name: "requiredForAccountTypes" });
  const selected = (field.value as string[]).includes(name);

  function handleToggle() {
    const current = field.value as string[];
    field.onChange(
      selected ? current.filter((t) => t !== name) : [...current, name],
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={disabled}
      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border transition-colors ${
        selected
          ? "bg-blue-500 text-white border-blue-500"
          : "bg-background text-muted-foreground border-border hover:border-blue-400"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {name}
    </button>
  );
}

export function DimensionFormDialog({ open, onOpenChange, dimension }: Props) {
  const isEdit = !!dimension;
  const create = useCreateDimension();
  const update = useUpdateDimension(dimension?.id ?? 0);
  const mutation = isEdit ? update : create;

  function handleSubmit(values: FormValues) {
    if (isEdit) {
      update.mutate(
        { name: values.name, requiredForAccountTypes: values.requiredForAccountTypes },
        {
          onSuccess: () => {
            toast.success("Dimension updated");
            onOpenChange(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        },
      );
    } else {
      create.mutate(values, {
        onSuccess: () => {
          toast.success("Dimension created");
          onOpenChange(false);
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      });
    }
  }

  return (
    <EntityFormDialog<FormValues>
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit Dimension" : "New Dimension"}
      description="Dimensions tag GL entries for cost centre, project, or department reporting."
      resolver={zodResolver(schema)}
      defaultValues={{
        name: dimension?.name ?? "",
        key: dimension?.key ?? "",
        requiredForAccountTypes: dimension?.requiredForAccountTypes ?? [],
      }}
      onSubmit={handleSubmit}
      isSubmitting={mutation.isPending}
      submitLabel={isEdit ? "Save Changes" : "Create"}
      resetOnOpen
    >
      {(form) => (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="dim-name">Name</Label>
            <Input
              id="dim-name"
              placeholder="e.g. Cost Centre"
              {...form.register("name")}
              className={form.formState.errors.name ? "border-destructive" : ""}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="dim-key">Key</Label>
            <Input
              id="dim-key"
              placeholder="e.g. cost_centre"
              readOnly={isEdit}
              {...form.register("key")}
              className={`font-mono text-sm ${isEdit ? "bg-muted" : ""} ${
                form.formState.errors.key ? "border-destructive" : ""
              }`}
            />
            {form.formState.errors.key && (
              <p className="text-xs text-destructive">{form.formState.errors.key.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Required for account types</Label>
            <div className="flex flex-wrap gap-1.5">
              {ACCOUNT_TYPES.map((t) => (
                <AccountTypeToggle key={t} name={t} disabled={mutation.isPending} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              When posting a journal, entries on these account types must carry this dimension.
            </p>
          </div>
        </div>
      )}
    </EntityFormDialog>
  );
}
