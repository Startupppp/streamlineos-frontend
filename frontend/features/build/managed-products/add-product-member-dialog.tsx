"use client";

import { useCallback, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Combobox } from "@/components/ui/combobox";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { ErrorState } from "@/components/shared/error-state";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import { useAddManagedProductMember } from "@/hooks/api/build/managed-product-members";
import { isWriteConflict } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAddProductMemberCandidates } from "./use-infinite-selector";
import { toast } from "sonner";

const addMemberSchema = z.object({
  membershipId: z.number().int().positive({ message: "Select a member" }),
  role: z.enum(["member", "admin"]),
});
type AddMemberFormValues = z.infer<typeof addMemberSchema>;

interface AddProductMemberDialogProps {
  managedProductId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingMembershipIds?: ReadonlySet<number>;
}

export function AddProductMemberDialog({
  managedProductId,
  open,
  onOpenChange,
  existingMembershipIds,
}: AddProductMemberDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedLabel, setSelectedLabel] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useAddProductMemberCandidates({
    search: debouncedSearch || undefined,
    enabled: open,
  });
  const addMember = useAddManagedProductMember(managedProductId);

  const form = useForm<AddMemberFormValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { membershipId: 0, role: "member" },
  });

  const membershipId = form.watch("membershipId");

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const memberOptions = useMemo(() => {
    const all = (data?.pages ?? [])
      .flatMap((p) => p.data)
      .filter((m) => !existingMembershipIds?.has(m.membershipId));
    const opts = all.map((m) => ({
      value: String(m.membershipId),
      label: m.name ?? m.email,
    }));
    if (membershipId > 0 && !opts.find((o) => o.value === String(membershipId))) {
      opts.unshift({ value: String(membershipId), label: selectedLabel || String(membershipId) });
    }
    return opts;
  }, [data, membershipId, selectedLabel, existingMembershipIds]);

  function handleOpenChange(next: boolean) {
    if (!next && addMember.isPending) return;
    if (!next) {
      form.reset();
      setSearch("");
      setSelectedLabel("");
    }
    onOpenChange(next);
  }

  const handleSearchChange = useCallback((v: string) => {
    setSearch(v);
  }, []);

  const handleMemberChange = useCallback(
    (v: string, label?: string) => {
      const id = v ? Number(v) : 0;
      form.setValue("membershipId", id, { shouldValidate: true });
      if (label) setSelectedLabel(label);
    },
    [form],
  );

  function handleRetry() {
    void refetch();
  }

  function handleSubmit(values: AddMemberFormValues) {
    if (addMember.isPending) return;
    addMember.mutate(
      { organizationMembershipId: values.membershipId, role: values.role },
      {
        onSuccess: () => {
          toast.success("Member added.");
          form.reset();
          setSearch("");
          setSelectedLabel("");
          onOpenChange(false);
        },
        onError: (e) => {
          if (isWriteConflict(e)) {
            toast.error("This person is already a member of this product.");
          } else {
            toast.error(getErrorMessage(e));
          }
        },
      },
    );
  }

  const handleRoleChange = useCallback(
    (v: string) => {
      if (v === "member" || v === "admin") {
        form.setValue("role", v, { shouldValidate: true });
      }
    },
    [form],
  );

  const roleValue = form.watch("role");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Add product member</DialogTitle>
          <DialogDescription>Give someone access to this product.</DialogDescription>
        </DialogHeader>
        <form
          id="add-product-member-form"
          aria-label="Add product member"
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-3 py-1"
          noValidate
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground">Member</label>
            {isError ? (
              <ErrorState
                compact
                error={error}
                description={getErrorMessage(error)}
                onRetry={handleRetry}
              />
            ) : (
              <Combobox
                aria-label="Select a member"
                options={memberOptions}
                value={membershipId > 0 ? String(membershipId) : ""}
                onChange={handleMemberChange}
                onSearchChange={handleSearchChange}
                placeholder="Select a member"
                searchPlaceholder="Search by name or email…"
                emptyText={isLoading ? "Loading…" : "No members found."}
                disabled={addMember.isPending}
                footer={
                  <InfiniteScrollSentinel
                    hasNextPage={hasNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                    onLoadMore={handleLoadMore}
                    label="Load more members"
                  />
                }
              />
            )}
            {form.formState.errors.membershipId ? (
              <p className="text-xs text-destructive" role="alert">
                {form.formState.errors.membershipId.message}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              className="text-xs font-medium text-foreground"
              htmlFor="add-product-member-role"
            >
              Role
            </label>
            <Select
              value={roleValue}
              onValueChange={handleRoleChange}
              disabled={addMember.isPending}
            >
              <SelectTrigger id="add-product-member-role" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="member">Member</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </form>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={addMember.isPending}
          >
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            form="add-product-member-form"
            size="sm"
            isPending={addMember.isPending}
            loadingText="Adding…"
          >
            Add member
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
