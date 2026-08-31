"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { Boxes } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { TablePagination } from "@/components/ui/table-pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingButton } from "@/components/ui/loading-button";
import { AppSheet, ErrorState, NoPermissionState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptyWarehouseIllustration } from "@/components/illustrations";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useCreateHandlingUnit,
  useHandlingUnit,
  useHandlingUnits,
  useMoveHandlingUnit,
  type HandlingUnitContentRow,
  type HandlingUnitStatus,
  type HandlingUnitSummary,
} from "@/hooks/api/inventory/handling-units";

const STATUS_BADGE: Record<HandlingUnitStatus, string> = {
  OPEN: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  CLOSED: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  SHIPPED: "bg-muted text-muted-foreground border-border",
  EMPTY: "bg-muted text-muted-foreground border-border",
};

const CONTENT_COLUMNS: DataTableColumn<HandlingUnitContentRow>[] = [
  {
    key: "variant",
    header: "Variant",
    cell: (row) => <span className="text-sm">#{row.productVariantId}</span>,
  },
  {
    key: "lot",
    header: "Lot",
    cell: (row) => (
      <span className="text-dense text-muted-foreground">{row.lotId ?? "\u2014"}</span>
    ),
  },
  {
    key: "onHand",
    header: "On hand",
    headerClassName: "text-right",
    className: "text-right font-mono tabular-nums font-semibold",
    cell: (row) => Number(row.onHand).toLocaleString(undefined, { maximumFractionDigits: 4 }),
  },
];

function HandlingUnitPanel({
  open,
  onOpenChange,
  handlingUnitId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  handlingUnitId: number | null;
}) {
  const canMove = useCan("inventory:stock:transfer");
  const { data, isLoading, isError, refetch } = useHandlingUnit(handlingUnitId);
  const move = useMoveHandlingUnit();
  const [toLocationId, setToLocationId] = useState("");

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleMove = useCallback(() => {
    if (!handlingUnitId) return;
    const destination = Number(toLocationId);
    if (!Number.isInteger(destination) || destination <= 0) {
      toast.error("Enter the location id to move to");
      return;
    }
    move.mutate(
      { handlingUnitId, toLocationId: destination },
      {
        onSuccess: () => {
          toast.success("Handling unit moved");
          setToLocationId("");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [handlingUnitId, move, toLocationId]);

  const isContainer = (data?.childIds.length ?? 0) > 0;

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title={data ? data.huCode : "Handling unit"}
      className="sm:max-w-2xl"
    >
      {isLoading ? (
        <div className="p-6 space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : isError || !data ? (
        <div className="p-6">
          <ErrorState
            title="Failed to load this handling unit"
            description="An error occurred while fetching the unit and its contents."
            onRetry={handleRetry}
          />
        </div>
      ) : (
        <div className="p-6 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={cn("text-dense", STATUS_BADGE[data.status])}>
              {data.status}
            </Badge>
            <Badge variant="outline" className="text-dense">
              {data.kind}
            </Badge>
            <span className="text-dense text-muted-foreground">
              {data.parentHuId !== null
                ? `Nested in #${data.parentHuId}`
                : data.locationId !== null
                  ? `At location #${data.locationId}`
                  : "Not placed"}
            </span>
          </div>

          {isContainer && (
            <p className="text-xs text-muted-foreground">
              This unit contains {data.childIds.length} other unit(s). Stock is held on the
              innermost unit, so the totals below are rolled up from its contents rather than held
              here.
            </p>
          )}

          {data.rolledUpContents.length > 0 ? (
            <DataTable
              data={data.rolledUpContents}
              columns={CONTENT_COLUMNS}
              getRowKey={(row) => `${row.handlingUnitId}:${row.productVariantId}:${row.lotId ?? 0}`}
              className="border-0"
            pagination={{ pageSize: 25 }}
            />
          ) : (
            <InventoryEmptyState
              illustration={<EmptyWarehouseIllustration />}
              title="Nothing on this unit"
              description="Receive stock onto it, or nest a unit that already holds some inside it."
            />
          )}

          {canMove && data.parentHuId === null && data.status !== "SHIPPED" && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <p className="text-dense font-semibold uppercase tracking-wider text-muted-foreground">
                Move
              </p>
              <p className="text-xs text-muted-foreground">
                Moves this unit and everything nested inside it. The ledger records the move line
                by line, exactly as a transfer does.
              </p>
              <div className="flex items-end gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="hu-destination">To location id</Label>
                  <Input
                    id="hu-destination"
                    inputMode="numeric"
                    value={toLocationId}
                    onChange={(e) => setToLocationId(e.target.value)}
                  />
                </div>
                <LoadingButton
                  size="sm"
                  onClick={handleMove}
                  isPending={move.isPending}
                  loadingText="Moving…"
                >
                  Move
                </LoadingButton>
              </div>
            </div>
          )}
        </div>
      )}
    </AppSheet>
  );
}

function HandlingUnitsContent() {
  const canView = useCan("inventory:stock:read");
  const canCreate = useCan("inventory:stock:transfer");
  const { data, isLoading, isError, refetch } = useHandlingUnits({ rootsOnly: true });
  const units = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const [unitsPage, setUnitsPage] = useState(1);
  const unitsPageSize = 24;
  const visibleUnits = useMemo(
    () => units.slice((unitsPage - 1) * unitsPageSize, unitsPage * unitsPageSize),
    [units, unitsPage],
  );
  const shouldReduceMotion = useReducedMotion();
  const create = useCreateHandlingUnit();

  const [selected, setSelected] = useState<HandlingUnitSummary | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const handleOpen = useCallback((unit: HandlingUnitSummary) => {
    setSelected(unit);
    setPanelOpen(true);
  }, []);

  const handlePanelOpenChange = useCallback((open: boolean) => {
    setPanelOpen(open);
    if (!open) setSelected(null);
  }, []);

  const handleCreate = useCallback(() => {
    create.mutate(
      { kind: "PALLET" },
      {
        onSuccess: (unit) => toast.success(`${unit.huCode} created`),
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [create]);

  function handleRetry(): void {
    void refetch();
  }

  const actions = canCreate ? (
    <LoadingButton onClick={handleCreate} isPending={create.isPending} loadingText="Creating…">
      <Boxes className="h-3.5 w-3.5" />
      New pallet
    </LoadingButton>
  ) : undefined;

  if (!canView) {
    return (
      <PageWrapper title="Handling units">
        <NoPermissionState permission="inventory:stock:read" className="flex-1" />
      </PageWrapper>
    );
  }

  if (isLoading) {
    return (
      <PageWrapper title="Handling units" actions={actions}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Handling units" actions={actions}>
        <ErrorState
          title="Failed to load handling units"
          description="An error occurred while fetching pallets and cages."
          onRetry={handleRetry}
        />
      </PageWrapper>
    );
  }

  return (
    <>
      <PageWrapper
        title="Handling units"
        subtitle="Pallets, cages and totes — what stock is actually standing on"
        actions={actions}
      >
        {units.length > 0 ? (
          <>
            <motion.div
              className="flex-1 min-h-0 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 content-start"
            variants={shouldReduceMotion ? undefined : staggerContainer}
            initial={shouldReduceMotion ? undefined : "hidden"}
            animate={shouldReduceMotion ? undefined : "visible"}
          >
            {visibleUnits.map((unit) => (
              <motion.div key={unit.id} variants={fadeUp}>
                <Card className="h-full">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm leading-tight truncate">{unit.huCode}</p>
                      <Badge variant="outline" className={cn("text-dense shrink-0", STATUS_BADGE[unit.status])}>
                        {unit.status}
                      </Badge>
                    </div>
                    <p className="text-dense text-muted-foreground">
                      {unit.kind} ·{" "}
                      {unit.locationId !== null ? `Location #${unit.locationId}` : "Not placed"}
                    </p>
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => handleOpen(unit)}>
                      Open
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            </motion.div>
            <TablePagination
              page={unitsPage}
              pageSize={unitsPageSize}
              total={units.length}
              onPageChange={setUnitsPage}
              className="shrink-0"
            />
          </>
        ) : (
          <InventoryEmptyState
            illustration={<EmptyWarehouseIllustration />}
            title="No handling units yet"
            description="A handling unit is the pallet, cage or tote stock is standing on. Create one and receive stock onto it."
            action={canCreate ? { label: "New pallet", onClick: handleCreate } : undefined}
          />
        )}
      </PageWrapper>

      <HandlingUnitPanel
        open={panelOpen}
        onOpenChange={handlePanelOpenChange}
        handlingUnitId={selected?.id ?? null}
      />
    </>
  );
}

export default function HandlingUnitsPage() {
  return (
    <Suspense>
      <HandlingUnitsContent />
    </Suspense>
  );
}
