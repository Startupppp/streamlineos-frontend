"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { cn } from "@/lib/utils";
import { EmptyTransferIllustration } from "@/components/illustrations";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { ErrorState, AppSheet } from "@/components/shared";
import { LoadCreateSheet } from "@/features/inventory/components/shipping/load-create-sheet";
import {
  LOAD_STATUS_BADGE,
  LOAD_STATUS_LABEL,
} from "@/features/inventory/lib";
import {
  useLoads,
  useLoad,
  useDispatchLoad,
  useCloseLoad,
  useCancelLoad,
  type Load,
} from "@/hooks/api/inventory/shipping";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";

const PAGE_LIMIT = 20;

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString();
}

interface LoadDetailPanelProps {
  loadId: number;
  onClose: () => void;
}

function LoadDetailPanel({ loadId, onClose }: LoadDetailPanelProps) {
  const loadQuery = useLoad(loadId);
  const dispatchMutation = useDispatchLoad();
  const closeMutation = useCloseLoad();
  const cancelMutation = useCancelLoad();
  const [confirmAction, setConfirmAction] = useState<"dispatch" | "close" | "cancel" | null>(null);

  function handleOpenDispatch(): void {
    setConfirmAction("dispatch");
  }

  function handleOpenClose(): void {
    setConfirmAction("close");
  }

  function handleOpenCancel(): void {
    setConfirmAction("cancel");
  }

  function handleDismissConfirm(): void {
    setConfirmAction(null);
  }

  function handleConfirmAction(): void {
    if (!loadQuery.data) return;
    const id = loadQuery.data.id;
    if (confirmAction === "dispatch") {
      dispatchMutation.mutate(id, {
        onSuccess: () => {
          toast.success("Load dispatched");
          setConfirmAction(null);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    } else if (confirmAction === "close") {
      closeMutation.mutate(id, {
        onSuccess: () => {
          toast.success("Load closed");
          setConfirmAction(null);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    } else if (confirmAction === "cancel") {
      cancelMutation.mutate(id, {
        onSuccess: () => {
          toast.success("Load cancelled");
          setConfirmAction(null);
          onClose();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    }
  }

  const load = loadQuery.data;
  const isPending =
    dispatchMutation.isPending || closeMutation.isPending || cancelMutation.isPending;

  if (loadQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  function handleRetryLoad(): void {
    void loadQuery.refetch();
  }

  if (loadQuery.error || !load) {
    return (
      <ErrorState
        title="Failed to load details"
        description={loadQuery.error != null ? getErrorMessage(loadQuery.error) : "Load not found"}
        onRetry={handleRetryLoad}
      />
    );
  }

  const confirmLabels = {
    dispatch: { title: "Dispatch Load", description: "Mark this load as dispatched. All members must be SHIPPED or IN_TRANSIT.", action: "Dispatch" },
    close: { title: "Close Load", description: "Mark this load as arrived and closed.", action: "Close" },
    cancel: { title: "Cancel Load", description: "Cancel this load. Only DRAFT loads can be cancelled.", action: "Cancel" },
  } as const;

  return (
    <>
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn("h-4 text-[9px] px-1.5 py-0 border", LOAD_STATUS_BADGE[load.status])}
          >
            {LOAD_STATUS_LABEL[load.status]}
          </Badge>
          <span className="text-xs text-muted-foreground">{formatDate(load.createdAt)}</span>
        </div>

        {load.name && (
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Name</p>
            <p className="text-sm font-medium">{load.name}</p>
          </div>
        )}

        <div>
          <p className="text-xs text-muted-foreground mb-2">Members ({load.members?.length ?? 0})</p>
          {load.members && load.members.length > 0 ? (
            <div className="divide-y divide-border rounded-lg border">
              {load.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between px-3 py-2">
                  <div>
                    <span className="text-xs text-muted-foreground">{member.type}</span>
                    <span className="ml-2 text-sm font-mono">#{member.referenceId}</span>
                  </div>
                  {member.status && (
                    <span className="text-xs text-muted-foreground">{member.status}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No members</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {(load.status === "DRAFT" || load.status === "DISPATCHED") && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenDispatch}
              disabled={isPending}
            >
              Dispatch
            </Button>
          )}
          {load.status === "ARRIVED" && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenClose}
              disabled={isPending}
            >
              Close Load
            </Button>
          )}
          {load.status === "DRAFT" && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleOpenCancel}
              disabled={isPending}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      {confirmAction && (
        <AlertDialog open onOpenChange={handleDismissConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmLabels[confirmAction].title}</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmLabels[confirmAction].description}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleDismissConfirm}>Cancel</AlertDialogCancel>
              <AlertDialogAction asChild>
                <LoadingButton onClick={handleConfirmAction} isPending={isPending} loadingText="Processing…">
                  {confirmLabels[confirmAction].action}
                </LoadingButton>
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

function LoadsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [detailOpen, setDetailOpen] = useState<boolean>(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState<boolean>(false);

  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

  function handlePageChange(nextPage: number): void {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(nextPage));
    }
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleRowClick(load: Load): void {
    setSelectedId(load.id);
    setDetailOpen(true);
  }

  function handleNewLoad(): void {
    setCreateOpen(true);
  }

  function handleDetailClose(open: boolean): void {
    setDetailOpen(open);
    if (!open) setSelectedId(null);
  }

  function handleDetailPanelClose(): void {
    handleDetailClose(false);
  }

  const loadsQuery = useLoads({ page, limit: PAGE_LIMIT });
  const items = loadsQuery.data?.items ?? [];
  const total = loadsQuery.data?.total ?? 0;

  function handleRetry(): void {
    void loadsQuery.refetch();
  }

  const columns: DataTableColumn<Load>[] = [
    {
      key: "id",
      header: "Load",
      cell: (l) => l.name ?? formatDate(l.createdAt),
    },
    {
      key: "status",
      header: "Status",
      cell: (l) => (
        <Badge
          variant="outline"
          className={cn("h-4 text-[9px] px-1.5 py-0 border", LOAD_STATUS_BADGE[l.status])}
        >
          {LOAD_STATUS_LABEL[l.status]}
        </Badge>
      ),
    },
    {
      key: "members",
      header: "Members",
      cell: (l) => (
        <span className="tabular-nums">{l.members?.length ?? 0}</span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (l) => (
        <span className="tabular-nums text-muted-foreground">{formatDate(l.createdAt)}</span>
      ),
    },
  ];

  const selectedLoad = selectedId !== null ? items.find((l) => l.id === selectedId) : undefined;

  return (
    <>
      <PageWrapper
        title="Loads"
        subtitle="Group shipments into transport loads"
        actions={
          <AnimatedIconButton icon={PlusIcon} iconSize={14} iconClassName="mr-1.5" size="sm" onClick={handleNewLoad}>
            New Load
          </AnimatedIconButton>
        }
      >
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          {loadsQuery.error ? (
            <ErrorState
              title="Failed to load loads"
              description={getErrorMessage(loadsQuery.error)}
              onRetry={handleRetry}
            />
          ) : (
            <DataTable
              data={items}
              columns={columns}
              getRowKey={(l) => l.id}
              isLoading={loadsQuery.isLoading}
              onRowClick={handleRowClick}
              emptyState={
                <InventoryEmptyState
                  illustration={<EmptyTransferIllustration />}
                  title="No loads yet"
                  description="Create a load to group shipments for transport."
                  action={{ label: "New Load", onClick: handleNewLoad }}
                  className="border-0 bg-transparent"
                />
              }
              pagination={{
                mode: "server",
                page,
                pageSize: PAGE_LIMIT,
                total,
                onPageChange: handlePageChange,
              }}
              minWidth="560px"
            />
          )}
        </div>
      </PageWrapper>

      <AppSheet
        open={detailOpen}
        onOpenChange={handleDetailClose}
        title={selectedLoad?.name ?? (selectedId ? `Load #${selectedId}` : "Load Details")}
        description={selectedLoad ? `Status: ${LOAD_STATUS_LABEL[selectedLoad.status]}` : undefined}
      >
        {selectedId !== null && (
          <LoadDetailPanel loadId={selectedId} onClose={handleDetailPanelClose} />
        )}
      </AppSheet>

      <LoadCreateSheet open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}

export default function LoadsPage() {
  return (
    <Suspense>
      <LoadsPageInner />
    </Suspense>
  );
}
