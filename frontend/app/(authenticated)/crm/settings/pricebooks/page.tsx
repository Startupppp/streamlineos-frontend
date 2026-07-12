"use client";

import { useState, useCallback, useTransition } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Pencil, Plus, Search, Trash2, List } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyProductsIllustration } from "@/components/illustrations";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ErrorState } from "@/components/shared";
import {
  usePricebooks,
  useCreatePricebook,
  useUpdatePricebook,
  useDeletePricebook,
} from "@/hooks/api/crm/pricebooks";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import {
  PricebookFormSheet,
  type PricebookFormValues,
  pricebookValuesFromPricebook,
  defaultPricebookValues,
} from "@/features/crm/settings/pricebooks/pricebook-form";
import { PricebookEntriesSheet } from "@/features/crm/settings/pricebooks/pricebook-entries-sheet";
import { getErrorMessage } from "@/lib/get-error-message";
import type { Pricebook } from "@/types/crm/pricebooks";

export default function PricebooksPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Pricebook | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [entriesTarget, setEntriesTarget] = useState<Pricebook | null>(null);
  const [entriesOpen, setEntriesOpen] = useState(false);

  const searchInput = searchParams.get("q") ?? "";
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname],
  );

  const { data: pricebooks, isLoading, isError, refetch } = usePricebooks();
  const createPricebook = useCreatePricebook();
  const updatePricebook = useUpdatePricebook();
  const deletePricebook = useDeletePricebook();

  const allPricebooks = pricebooks ?? [];
  const filtered = debouncedSearch
    ? allPricebooks.filter((pb) =>
        pb.name.toLowerCase().includes(debouncedSearch.toLowerCase()),
      )
    : allPricebooks;

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateParams({ q: e.target.value || null });
    },
    [updateParams],
  );

  const handleOpenCreate = useCallback(() => {
    setEditTarget(null);
    setSheetOpen(true);
  }, []);

  const handleOpenEdit = useCallback((pb: Pricebook) => {
    setEditTarget(pb);
    setSheetOpen(true);
  }, []);

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setSheetOpen(open);
    if (!open) setEditTarget(null);
  }, []);

  const handleDeleteRequest = useCallback((id: string) => setDeleteTargetId(id), []);
  const handleDeleteCancel = useCallback(() => setDeleteTargetId(null), []);

  const handleAlertOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTargetId(null);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (deleteTargetId === null) return;
    deletePricebook.mutate(deleteTargetId, {
      onSuccess: () => {
        toast.success("Pricebook deleted");
        setDeleteTargetId(null);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
        setDeleteTargetId(null);
      },
    });
  }, [deletePricebook, deleteTargetId]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleOpenEntries = useCallback((pb: Pricebook) => {
    setEntriesTarget(pb);
    setEntriesOpen(true);
  }, []);

  const handleEntriesOpenChange = useCallback((open: boolean) => {
    setEntriesOpen(open);
    if (!open) setEntriesTarget(null);
  }, []);

  const onFormSubmit = useCallback(
    (formData: PricebookFormValues) => {
      if (editTarget) {
        updatePricebook.mutate(
          { id: editTarget.id, ...formData },
          {
            onSuccess: () => {
              toast.success("Pricebook updated");
              setSheetOpen(false);
              setEditTarget(null);
            },
            onError: (err) => toast.error(getErrorMessage(err)),
          },
        );
      } else {
        createPricebook.mutate(formData, {
          onSuccess: () => {
            toast.success("Pricebook created");
            setSheetOpen(false);
          },
          onError: (err) => toast.error(getErrorMessage(err)),
        });
      }
    },
    [editTarget, updatePricebook, createPricebook],
  );

  const handleEditRow = useCallback((pb: Pricebook) => handleOpenEdit(pb), [handleOpenEdit]);
  const handleDeleteRow = useCallback((id: string) => handleDeleteRequest(id), [handleDeleteRequest]);
  const handleEntriesRow = useCallback((pb: Pricebook) => handleOpenEntries(pb), [handleOpenEntries]);

  const columns: DataTableColumn<Pricebook>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (pb) => pb.name,
      cell: (pb) => (
        <div>
          <p className="font-medium text-sm">{pb.name}</p>
          {pb.description && (
            <p className="text-xs text-muted-foreground truncate max-w-[220px]">{pb.description}</p>
          )}
        </div>
      ),
    },
    {
      key: "currency",
      header: "Currency",
      cell: (pb) => <span className="font-mono text-xs">{pb.currency}</span>,
    },
    {
      key: "isDefault",
      header: "Default",
      cell: (pb) =>
        pb.isDefault ? (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Default
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        ),
    },
    {
      key: "isActive",
      header: "Status",
      cell: (pb) =>
        pb.isActive ? (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            Active
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-slate-100 text-slate-500 border-slate-200">
            Inactive
          </Badge>
        ),
    },
    {
      key: "entries",
      header: "Entries",
      cell: (pb) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => handleEntriesRow(pb)}
        >
          <List className="h-3.5 w-3.5" />
          Manage Entries
        </Button>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      className: "text-right",
      cell: (pb) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditRow(pb)}
            aria-label="Edit pricebook"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteRow(pb.id)}
            className="text-destructive hover:text-destructive"
            aria-label="Delete pricebook"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const isPending = createPricebook.isPending || updatePricebook.isPending;
  const formInitialValues = editTarget
    ? pricebookValuesFromPricebook(editTarget)
    : defaultPricebookValues;

  return (
    <>
      <AlertDialog open={deleteTargetId !== null} onOpenChange={handleAlertOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pricebook</AlertDialogTitle>
            <AlertDialogDescription>
              This pricebook will be permanently deleted along with all its pricing entries.
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

      <PricebookFormSheet
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        editTarget={editTarget}
        onSubmit={onFormSubmit}
        isPending={isPending}
        initialValues={formInitialValues}
      />

      <PricebookEntriesSheet
        open={entriesOpen}
        onOpenChange={handleEntriesOpenChange}
        pricebook={entriesTarget}
      />

      <PageWrapper
        title="Price Books"
        subtitle="Manage pricebooks and product pricing tiers"
        actions={
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Pricebook
          </Button>
        }
        filters={
          <div className="flex w-full min-w-0 items-center gap-2">
            <div className="relative min-w-0 flex-1 lg:max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search pricebooks..."
                value={searchInput}
                onChange={handleSearchChange}
                className="h-8 w-full pl-8 text-xs"
              />
            </div>
          </div>
        }
      >
        {isError ? (
          <ErrorState title="Failed to load pricebooks" onRetry={handleRetry} />
        ) : (
          <DataTable
            data={filtered}
            columns={columns}
            getRowKey={(pb) => pb.id}
            isLoading={isLoading}
            emptyState={
              <EmptyState
                className="flex-1 min-h-[50vh] border-0 bg-transparent"
                illustration={<EmptyProductsIllustration />}
                title={debouncedSearch ? "No pricebooks match your search" : "No pricebooks yet"}
                description={
                  debouncedSearch
                    ? "Try a different search term."
                    : "Create pricebooks to manage product pricing tiers for different customer segments."
                }
                action={debouncedSearch ? undefined : { label: "Add Pricebook", onClick: handleOpenCreate }}
              />
            }
          />
        )}
      </PageWrapper>
    </>
  );
}
