"use client";

import { useCallback, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useController } from "react-hook-form";
import { toast } from "sonner";
import { EntityFormDialog } from "@/components/shared";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { getErrorMessage } from "@/lib/get-error-message";
import { getUserDisplayName } from "@/lib/person-display";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import {
  useAssignableWarehouseUsers,
  useGrantWarehouseUser,
} from "@/hooks/api/inventory/warehouses";
import {
  assignWarehouseUserSchema,
  type AssignWarehouseUserInput,
} from "./warehouse-access-schema";

interface AssignWarehouseUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouseId: number;
  warehouseName: string;
}

interface MemberFieldProps {
  options: ComboboxOption[];
  isLoading: boolean;
  onSearchChange: (search: string) => void;
}

const DEFAULT_VALUES: AssignWarehouseUserInput = { userId: "" };

function MemberField({ options, isLoading, onSearchChange }: MemberFieldProps) {
  const { field } = useController<AssignWarehouseUserInput>({ name: "userId" });

  const handleChange = useCallback(
    (userId: string) => {
      field.onChange(userId);
    },
    [field],
  );

  return (
    <Combobox
      options={options}
      value={field.value}
      onChange={handleChange}
      onSearchChange={onSearchChange}
      placeholder="Select a member…"
      searchPlaceholder="Search by name or email…"
      emptyText={isLoading ? "Loading members…" : "No eligible members found."}
    />
  );
}

export function AssignWarehouseUserDialog({
  open,
  onOpenChange,
  warehouseId,
  warehouseName,
}: AssignWarehouseUserDialogProps) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const { data, isLoading } = useAssignableWarehouseUsers(warehouseId, debouncedSearch, {
    enabled: open,
  });
  const grant = useGrantWarehouseUser(warehouseId);

  const options = useMemo<ComboboxOption[]>(
    () =>
      (data ?? []).map((user) => ({
        value: user.userId,
        label: getUserDisplayName(user),
        sublabel: user.email,
      })),
    [data],
  );

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  function handleSubmit(values: AssignWarehouseUserInput) {
    grant.mutate(
      { userId: values.userId },
      {
        onSuccess: (result) => {
          toast.success(
            result.granted
              ? `Warehouse access granted for ${warehouseName}`
              : `That member already had access to ${warehouseName}`,
          );
          setSearch("");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <EntityFormDialog<AssignWarehouseUserInput>
      open={open}
      onOpenChange={onOpenChange}
      title="Assign warehouse access"
      description={`Grant a member permission to see and transact in ${warehouseName}.`}
      resolver={zodResolver(assignWarehouseUserSchema)}
      defaultValues={DEFAULT_VALUES}
      onSubmit={handleSubmit}
      isSubmitting={grant.isPending}
      submitLabel="Grant access"
      resetOnOpen
    >
      {(form) => (
        <FormField
          control={form.control}
          name="userId"
          render={() => (
            <FormItem>
              <FormLabel>Member</FormLabel>
              <FormControl>
                <MemberField
                  options={options}
                  isLoading={isLoading}
                  onSearchChange={handleSearchChange}
                />
              </FormControl>
              <FormDescription>
                Only active members who do not already hold this warehouse are listed.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </EntityFormDialog>
  );
}
