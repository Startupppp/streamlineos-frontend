"use client";

import { PlusIcon } from "@animateicons/react/lucide";
import { useMemo, useState } from "react";
import { toast } from "sonner";
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
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyMailIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared/error-state";
import { LoadingState } from "@/components/shared/loading-state";
import { MacroCard } from "@/features/support/macros/macro-card";
import { MacroDialog } from "@/features/support/macros/macro-dialog";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import {
  useDeleteMacro,
  useMacroUsage,
  useSupportMacros,
  type SupportMacro,
} from "@/hooks/api/support/macros";
import { getErrorMessage } from "@/lib/get-error-message";

export default function SupportMacrosPage() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SupportMacro | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SupportMacro | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const query = debouncedSearch.trim()
    ? { search: debouncedSearch.trim() }
    : undefined;
  const { data: macros, isLoading, isError, refetch } = useSupportMacros(query);
  const { data: usageData } = useMacroUsage();
  const deleteMacro = useDeleteMacro();
  const usageById = useMemo(
    () =>
      new Map((usageData ?? []).map((entry) => [entry.id, entry.usageCount])),
    [usageData],
  );
  const categoryOptions = useMemo(
    () => getCategoryOptions(macros ?? []),
    [macros],
  );

  async function handleCopy(macro: SupportMacro) {
    try {
      await navigator.clipboard.writeText(macro.body);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  }

  function handleDelete() {
    if (!deleteTarget) return;
    deleteMacro.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Canned response deleted");
        setDeleteTarget(null);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <PageWrapper
      title="Canned Responses"
      subtitle="Reusable reply templates for faster support"
      actions={
        <AnimatedIconButton
          size="sm"
          onClick={() => setCreateOpen(true)}
          icon={PlusIcon}
          iconClassName="mr-1.5"
        >
          New Response
        </AnimatedIconButton>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <SearchInput
          placeholder="Search responses…"
          value={search}
          onValueChange={setSearch}
        />
        {isLoading ? <LoadingState variant="cards" rows={9} /> : null}
        {isError ? <ErrorState onRetry={() => void refetch()} /> : null}
        {!isLoading && !isError && macros && macros.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {macros.map((macro) => (
              <MacroCard
                key={macro.id}
                macro={macro}
                usageCount={usageById.get(macro.id) ?? macro.usageCount ?? 0}
                onCopy={handleCopy}
                onEdit={setEditTarget}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        ) : null}
        {!isLoading && !isError && (!macros || macros.length === 0) ? (
          <EmptyState
            illustration={<EmptyMailIllustration />}
            title={
              search.trim()
                ? "No matching responses"
                : "No canned responses yet"
            }
            description={
              search.trim()
                ? "Try a different search term."
                : "Create reusable reply templates to speed up support."
            }
            action={
              search.trim()
                ? undefined
                : { label: "New Response", onClick: () => setCreateOpen(true) }
            }
            className="flex-1"
          />
        ) : null}
      </div>
      {createOpen ? (
        <MacroDialog
          categoryOptions={categoryOptions}
          onClose={() => setCreateOpen(false)}
        />
      ) : null}
      {editTarget ? (
        <MacroDialog
          macro={editTarget}
          categoryOptions={categoryOptions}
          onClose={() => setEditTarget(null)}
        />
      ) : null}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete canned response?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleteTarget?.title}&rdquo; will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}

function getCategoryOptions(macros: SupportMacro[]): string[] {
  const categories = new Map<string, string>();
  for (const macro of macros) {
    const category = macro.category?.trim();
    if (category && !categories.has(category.toLowerCase())) {
      categories.set(category.toLowerCase(), category);
    }
  }
  return [...categories.values()].sort((left, right) =>
    left.localeCompare(right),
  );
}
