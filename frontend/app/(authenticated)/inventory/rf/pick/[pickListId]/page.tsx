"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptyWarehouseIllustration } from "@/components/illustrations";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { RfShell } from "@/features/inventory/components/rf/rf-shell";
import { RfStep } from "@/features/inventory/components/rf/rf-step";
import { usePickWave, useConfirmPick } from "@/hooks/api/inventory/picking";
import { useCaptureScan } from "@/hooks/api/inventory/scan";
import { randomId } from "@/lib/random-id";

const PICK_READ = "inventory:sales-orders:read";
const PICK_WRITE = "inventory:sales-orders:ship";

function RfPickContent() {
  const params = useParams<{ pickListId: string }>();
  const router = useRouter();
  const pickListId = Number(params.pickListId);

  const canRead = useCan(PICK_READ);
  const canPick = useCan(PICK_WRITE);
  const { data, isLoading, isError, refetch } = usePickWave(pickListId);
  const confirm = useConfirmPick();
  const capture = useCaptureScan();

  const [doneLineIds, setDoneLineIds] = useState<number[]>([]);

  const openLines = useMemo(
    () => (data?.lines ?? []).filter((line) => !line.line_closed && !doneLineIds.includes(line.id)),
    [data?.lines, doneLineIds],
  );
  const line = openLines[0];

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleConfirm = useCallback(
    async ({ quantity, scannedPayload }: { quantity: string; scannedPayload: string | null }) => {
      if (!line) return;
      try {
        if (scannedPayload) {
          await capture.mutateAsync({
            payload: scannedPayload,
            idempotencyKey: randomId(),
          });
        }
        await confirm.mutateAsync({
          pickListId,
          pickLineId: line.id,
          quantityPicked: quantity,
          ...(scannedPayload ? { scannedPayload } : {}),
        });
        setDoneLineIds((ids) => [...ids, line.id]);
        toast.success(`${line.sku} confirmed`);
      } catch (error) {
        toast.error(getErrorMessage(error));
      }
    },
    [capture, confirm, line, pickListId],
  );

  const handleBackToQueue = useCallback(() => router.push("/inventory/rf"), [router]);

  if (!canRead) {
    return (
      <RfShell title="Pick" backHref="/inventory/rf">
        <NoPermissionState permission={PICK_READ} className="flex-1" />
      </RfShell>
    );
  }

  if (isLoading) {
    return (
      <RfShell title="Pick" backHref="/inventory/rf">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-14 w-full" />
      </RfShell>
    );
  }

  if (isError || !data) {
    return (
      <RfShell title="Pick" backHref="/inventory/rf">
        <ErrorState
          title="Could not load this wave"
          description="The wave could not be fetched. Nothing you confirmed has been lost."
          onRetry={handleRetry}
        />
      </RfShell>
    );
  }

  if (!canPick) {
    return (
      <RfShell title={data.pickNumber} backHref="/inventory/rf">
        <NoPermissionState permission={PICK_WRITE} className="flex-1" />
      </RfShell>
    );
  }

  if (!line) {
    return (
      <RfShell title={data.pickNumber} backHref="/inventory/rf">
        <InventoryEmptyState
          illustration={<EmptyWarehouseIllustration />}
          title="Wave finished"
          description="Every line on this wave is closed. Take the tote to packing."
          action={{ label: "Back to my tasks", onClick: handleBackToQueue }}
        />
      </RfShell>
    );
  }

  const closedCount = (data.lines ?? []).length - openLines.length;

  return (
    <RfShell
      title={data.pickNumber}
      subtitle={data.soId ? `Order #${data.soId}` : undefined}
      backHref="/inventory/rf"
    >
      <RfStep
        key={line.id}
        sku={line.sku}
        productName={line.variant_name}
        locationCode={line.location_code}
        lotNumber={line.lot_number}
        quantityAsked={line.quantity_to_pick}
        quantityDone={line.quantity_picked}
        position={{ index: closedCount + 1, total: (data.lines ?? []).length }}
        isPending={confirm.isPending || capture.isPending}
        onConfirm={handleConfirm}
      />
    </RfShell>
  );
}

export default function RfPickPage() {
  return (
    <Suspense>
      <RfPickContent />
    </Suspense>
  );
}
