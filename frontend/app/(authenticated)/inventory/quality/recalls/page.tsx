"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlusIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorState, AppDialog } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptySearchIllustration } from "@/components/illustrations";
import { useRecalls, useCreateRecall } from "@/hooks/api/inventory/quality";
import type { Recall } from "@/hooks/api/inventory/quality";
import { RecallDetailSheet } from "@/features/inventory/components/quality/recall-detail-sheet";
import { RECALL_STATUS_BADGE, RECALL_STATUS_LABEL } from "@/features/inventory/lib";
import { cn } from "@/lib/utils";
import { TABLE_TITLE_CELL, TEXT_ONE_LINE } from "@/lib/text-overflow";

const PAGE_LIMIT = 20;

const createSchema = z.object({
  title: z.string().min(1, "Required"),
  reason: z.string().min(1, "Required"),
  severity: z.string().optional(),
  lotIdsRaw: z.string().optional(),
  serialIdsRaw: z.string().optional(),
});

type CreateFormValues = z.infer<typeof createSchema>;

function CreateRecallDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const createMut = useCreateRecall();

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { title: "", reason: "", severity: "", lotIdsRaw: "", serialIdsRaw: "" },
  });

  function handleCancel(): void {
    onOpenChange(false);
  }

  function handleSubmit(values: CreateFormValues): void {
    const lotIds = values.lotIdsRaw
      ? values.lotIdsRaw.split(",").map((s) => Number(s.trim())).filter((n) => !isNaN(n) && n > 0)
      : undefined;
    const serialIds = values.serialIdsRaw
      ? values.serialIdsRaw.split(",").map((s) => Number(s.trim())).filter((n) => !isNaN(n) && n > 0)
      : undefined;

    createMut.mutate(
      {
        title: values.title,
        reason: values.reason,
        severity: values.severity || undefined,
        lotIds: lotIds?.length ? lotIds : undefined,
        serialIds: serialIds?.length ? serialIds : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Recall created");
          form.reset();
          onOpenChange(false);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  const footer = (
    <>
      <Button size="sm" variant="outline" onClick={handleCancel}>Cancel</Button>
      <Button size="sm" onClick={form.handleSubmit(handleSubmit)} disabled={createMut.isPending}>
        {createMut.isPending ? "Creating…" : "Create Recall"}
      </Button>
    </>
  );

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New Recall"
      description="Create a product recall"
      footer={footer}
    >
      <form className="space-y-4" onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="space-y-1.5">
          <Label className="text-xs">Title *</Label>
          <Input className="text-xs" placeholder="e.g. Batch contamination recall" {...form.register("title")} />
          {form.formState.errors.title && (
            <p className="text-[10px] text-destructive">{form.formState.errors.title.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Reason *</Label>
          <Textarea className="text-xs min-h-[70px] resize-none" placeholder="Describe the recall reason…" {...form.register("reason")} />
          {form.formState.errors.reason && (
            <p className="text-[10px] text-destructive">{form.formState.errors.reason.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Severity <span className="text-muted-foreground">(opt.)</span></Label>
          <Input className="text-xs" placeholder="e.g. High, Medium, Low" {...form.register("severity")} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Lot IDs <span className="text-muted-foreground">(comma-separated)</span></Label>
          <Input className="text-xs" placeholder="e.g. 1, 2, 3" {...form.register("lotIdsRaw")} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Serial IDs <span className="text-muted-foreground">(comma-separated)</span></Label>
          <Input className="text-xs" placeholder="e.g. 10, 11, 12" {...form.register("serialIdsRaw")} />
        </div>
      </form>
    </AppDialog>
  );
}

function RecallsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

  function handlePageChange(nextPage: number): void {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage <= 1) params.delete("page");
    else params.set("page", String(nextPage));
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function handleRowClick(row: Recall): void {
    setSelectedId(row.id);
  }

  function handleDetailOpenChange(v: boolean): void {
    if (!v) setSelectedId(null);
  }

  function handleCreateOpenChange(v: boolean): void {
    setCreateOpen(v);
  }

  function handleOpenCreate(): void {
    setCreateOpen(true);
  }

  const recallsQuery = useRecalls({ page, limit: PAGE_LIMIT });

  const items = recallsQuery.data?.items ?? [];
  const total = recallsQuery.data?.total ?? 0;

  function handleRetry(): void {
    void recallsQuery.refetch();
  }

  const columns: DataTableColumn<Recall>[] = [
    {
      key: "title",
      header: "Title",
      className: TABLE_TITLE_CELL,
      cell: (r) => (
        <span className={cn("font-medium", TEXT_ONE_LINE)} title={r.title}>
          {r.title}
        </span>
      ),
      sortable: true,
      sortValue: (r) => r.title,
    },
    {
      key: "severity",
      header: "Severity",
      headerClassName: "w-[100px]",
      className: "text-muted-foreground",
      cell: (r) => r.severity ?? "—",
    },
    {
      key: "status",
      header: "Status",
      headerClassName: "w-[110px]",
      cell: (r) => (
        <Badge
          variant="outline"
          className={cn("h-4 text-[9px] px-1.5 py-0 border", RECALL_STATUS_BADGE[r.status])}
        >
          {RECALL_STATUS_LABEL[r.status]}
        </Badge>
      ),
    },
    {
      key: "lots",
      header: "Lots",
      headerClassName: "w-[70px] text-right",
      className: "text-right tabular-nums text-muted-foreground",
      cell: (r) => r.lines.length,
    },
    {
      key: "createdAt",
      header: "Created",
      headerClassName: "w-[130px]",
      className: "text-muted-foreground",
      cell: (r) => format(new Date(r.createdAt), "dd MMM yyyy"),
      sortable: true,
      sortValue: (r) => r.createdAt,
    },
  ];

  return (
    <>
      <PageWrapper
        title="Recalls"
        subtitle="Manage product recalls"
        actions={
          <AnimatedIconButton icon={PlusIcon} iconSize={14} iconClassName="mr-1.5" size="sm" onClick={handleOpenCreate}>
            New Recall
          </AnimatedIconButton>
        }
      >
        <div className="flex flex-1 min-h-0 flex-col gap-4">
          {recallsQuery.error ? (
            <ErrorState
              title="Failed to load recalls"
              description={getErrorMessage(recallsQuery.error)}
              onRetry={handleRetry}
            />
          ) : (
            <DataTable
              data={items}
              columns={columns}
              getRowKey={(r) => r.id}
              onRowClick={handleRowClick}
              isLoading={recallsQuery.isLoading}
              emptyState={
                <InventoryEmptyState
                  illustration={<EmptySearchIllustration />}
                  title="No recalls yet"
                  description="Product recalls will appear here once created."
                  action={{ label: "New Recall", onClick: handleOpenCreate }}
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

      <RecallDetailSheet
        open={selectedId !== null}
        onOpenChange={handleDetailOpenChange}
        recallId={selectedId}
      />

      <CreateRecallDialog open={createOpen} onOpenChange={handleCreateOpenChange} />
    </>
  );
}

export default function RecallsPage() {
  return (
    <Suspense>
      <RecallsPageInner />
    </Suspense>
  );
}
