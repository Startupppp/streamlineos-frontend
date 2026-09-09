"use client";

import { useMemo, type ReactNode } from "react";
import { toast } from "sonner";
import { UserRoundCogIcon } from "@animateicons/react/lucide";
import { MemberPicker } from "@/components/shared";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import { getUserDisplayName } from "@/lib/person-display";
import { useCan } from "@/hooks/api/access";
import { useReassignPickWave, WAVE_WRITE_KEY } from "@/hooks/api/inventory/picking";
import {
  useWarehouseAssignees,
  WAREHOUSE_ASSIGNMENT_PERMISSION,
} from "@/hooks/api/inventory/warehouses";

/** `listWarehouseUsersSchema` caps `limit` at 100; asking for more is a 400. */
const ROSTER_LIMIT = 100;

interface PickWaveReassignProps {
  pickListId: number;
  /** The wave's warehouse, which is also the scope the roster is drawn from. */
  warehouseId: number | null;
  /** Whoever holds the claim now, excluded from the roster. */
  assignedTo: string | null;
  /** COMPLETED / CANCELLED. The server answers 400, so the control is not offered. */
  finished: boolean;
}

function ReassignRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-between gap-2">{children}</div>;
}

function ReassignNote({ children }: { children: ReactNode }) {
  return (
    <ReassignRow>
      <span className="text-xs text-muted-foreground">{children}</span>
    </ReassignRow>
  );
}

/**
 * Handing a claimed wave to a different picker.
 *
 * ## Why the roster is the warehouse, not the organisation
 *
 * `WarehouseScopeService` denies by default: a picker with no grant on this
 * warehouse cannot read the wave, let alone confirm a line against it. Offering
 * the whole member directory would therefore let a supervisor hand a walk to
 * somebody who opens it to a 403 — the goods stay on the shelf and the wave
 * looks assigned. `GET /inventory/warehouses/:id/users` is exactly the set that
 * can act here, and it returns names, so nothing on this control renders a raw
 * id.
 *
 * It also happens to be the only roster this operator can read. The org
 * directory sits behind `settings:view`, which the `INVENTORY_MANAGER` template
 * does not carry — the person most likely to reassign a wave would have been
 * shown an empty picker and no reason why.
 *
 * ## Two permissions, deliberately
 *
 * `inventory:sales-orders:ship` is the endpoint's own key and decides whether
 * the control exists at all. `inventory:warehouses:manage` only decides whether
 * the roster can be read; holding the first without the second is a real
 * combination, and it says so rather than rendering a picker with nothing in it.
 */
export function PickWaveReassign({
  pickListId,
  warehouseId,
  assignedTo,
  finished,
}: PickWaveReassignProps) {
  const canReassign = useCan(WAVE_WRITE_KEY);
  const canReadRoster = useCan(WAREHOUSE_ASSIGNMENT_PERMISSION);
  const reassign = useReassignPickWave();
  const roster = useWarehouseAssignees(
    warehouseId ?? 0,
    { page: 1, limit: ROSTER_LIMIT },
    { enabled: canReassign && !finished },
  );

  const candidates = useMemo(
    () =>
      (roster.data?.items ?? [])
        .filter((assignee) => assignee.userId !== assignedTo)
        .map((assignee) => ({
          id: assignee.userId,
          name: assignee.name,
          firstName: assignee.firstName,
          lastName: assignee.lastName,
          email: assignee.email,
          image: assignee.image,
        })),
    [roster.data?.items, assignedTo],
  );

  function handleSelect(userId: string | null): void {
    if (!userId) return;
    const picked = candidates.find((candidate) => candidate.id === userId);
    reassign.mutate(
      { pickListId, assigneeUserId: userId },
      {
        onSuccess: () =>
          toast.success(
            picked ? `Wave handed to ${getUserDisplayName(picked)}` : "Wave handed over",
          ),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleRetry(): void {
    void roster.refetch();
  }

  // Denied, and the sheet already says why it is read-only. A control the
  // handler would refuse is not shown at all (frontend §17).
  if (!canReassign || finished) return null;

  if (warehouseId === null) {
    return (
      <ReassignNote>
        This wave is not scoped to a warehouse, so there is no picker roster to hand it to.
      </ReassignNote>
    );
  }

  if (!canReadRoster) {
    return (
      <ReassignNote>
        Handing this wave to someone else needs warehouse-assignment access.
      </ReassignNote>
    );
  }

  if (roster.isLoading) {
    return (
      <ReassignRow>
        <span className="text-xs text-muted-foreground">Loading who can pick here…</span>
        <Skeleton className="h-9 w-32 rounded-md" />
      </ReassignRow>
    );
  }

  if (roster.isError) {
    return (
      <ReassignRow>
        <span className="text-xs text-muted-foreground">
          {getErrorMessage(roster.error)}
        </span>
        <Button variant="outline" size="sm" onClick={handleRetry}>
          Retry
        </Button>
      </ReassignRow>
    );
  }

  if (candidates.length === 0) {
    return (
      <ReassignNote>
        Nobody else holds scope on this warehouse, so there is no one to hand it to.
      </ReassignNote>
    );
  }

  const label = assignedTo === null ? "Assign a picker" : "Hand to someone else";

  return (
    <ReassignRow>
      <span className="text-xs text-muted-foreground">
        {assignedTo === null
          ? "Send this walk out with a named picker."
          : "Move this walk to a different picker on this warehouse."}
      </span>
      {reassign.isPending ? (
        <LoadingButton variant="outline" size="sm" isPending loadingText="Handing over…">
          {label}
        </LoadingButton>
      ) : (
        <MemberPicker
          candidates={candidates}
          onChange={handleSelect}
          contentAlign="end"
          trigger={
            <AnimatedIconButton
              icon={UserRoundCogIcon}
              iconSize={16}
              iconClassName="mr-1.5"
              variant="outline"
              size="sm"
            >
              {label}
            </AnimatedIconButton>
          }
        />
      )}
    </ReassignRow>
  );
}
