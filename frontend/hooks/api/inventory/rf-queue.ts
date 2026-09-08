"use client";

import { useMemo } from "react";
import { usePickWaves } from "@/hooks/api/inventory/picking";
import { usePutawayTasks } from "@/hooks/api/inventory/putaway";
import { useCycleCounts } from "@/hooks/api/inventory/counts";
import { useCan } from "@/hooks/api/access";

/**
 * NEO-5 - the operator's queue, as one list.
 *
 * A picker on a handheld has one question - "what am I doing next" - and before
 * this the answer was spread across three desktop screens with their own filters,
 * their own pagination and their own idea of what "mine" means. This composes
 * the three existing queues rather than adding a fourth server surface: the
 * assignment filters already exist and are already warehouse-scoped, and a new
 * endpoint would be a second definition of "assigned to me".
 *
 * Deliberately not sorted by priority. There is no priority in the data, and
 * inventing one here would put an ordering on a picker's day that nothing in the
 * system can explain or change.
 */
export type RfTaskKind = "PICK" | "PUTAWAY" | "COUNT";

export interface RfTask {
  kind: RfTaskKind;
  id: number;
  reference: string;
  /** What is left to do, in words the operator recognises. */
  summary: string;
  warehouseId: number | null;
  href: string;
}

export interface RfQueue {
  tasks: RfTask[];
  isLoading: boolean;
  isError: boolean;
  /** True when the operator holds none of the three task permissions. */
  isDenied: boolean;
  refetch: () => void;
}

const PICK_KEY = "inventory:sales-orders:read";
const PUTAWAY_KEY = "inventory:stock:read";
const COUNT_KEY = "inventory:stock:reconcile";

export function useRfQueue(): RfQueue {
  const canPick = useCan(PICK_KEY);
  const canPutaway = useCan(PUTAWAY_KEY);
  const canCount = useCan(COUNT_KEY);

  const waves = usePickWaves(
    { assignment: "MINE", limit: 25 },
    { enabled: canPick },
  );
  const putaways = usePutawayTasks(
    { assignment: "MINE", limit: 25 },
    { enabled: canPutaway },
  );
  // `useCycleCounts` gates itself on `inventory:stock:read`, but a COUNT task
  // links to a screen that needs COUNT_KEY. Ungated, a picker with read but not
  // reconcile was offered work that lands on Access Denied -- the one thing the
  // route rules say never to render.
  // COUNTING is the cycle-count status. IN_PROGRESS belongs to InspectionStatus,
  // a different entity, and the API answers 400 for it — which took the whole
  // queue down, because one failing source is enough to show "Could not load
  // your tasks" over the picks and putaways that had loaded fine.
  const counts = useCycleCounts({ status: "COUNTING" }, { enabled: canCount });

  const tasks = useMemo<RfTask[]>(() => {
    const out: RfTask[] = [];

    for (const wave of waves.data?.items ?? []) {
      const open = Math.max(0, wave.lineCount - wave.linesClosed);
      out.push({
        kind: "PICK",
        id: wave.id,
        reference: wave.pickNumber,
        summary: `${open} line${open === 1 ? "" : "s"} to pick`,
        warehouseId: wave.warehouseId,
        href: `/inventory/rf/pick/${wave.id}`,
      });
    }

    for (const task of putaways.data?.items ?? []) {
      const open = Math.max(0, task.lineCount - task.linesClosed);
      out.push({
        kind: "PUTAWAY",
        id: task.id,
        reference: task.taskNumber,
        summary: `${open} line${open === 1 ? "" : "s"} to put away`,
        warehouseId: task.warehouseId,
        href: `/inventory/rf/putaway/${task.id}`,
      });
    }

    for (const count of counts.data?.items ?? []) {
      out.push({
        kind: "COUNT",
        id: count.id,
        reference: count.countNumber,
        // Counting has its own screen and its own posting rules; the RF queue
        // shows it so an operator's list is complete, and hands off rather than
        // reimplementing a variance review on a handheld.
        summary: `${count.lineCount} line${count.lineCount === 1 ? "" : "s"} to count`,
        warehouseId: null,
        href: `/inventory/cycle-counts?count=${count.id}`,
      });
    }

    return out;
  }, [counts.data, putaways.data, waves.data]);

  return {
    tasks,
    isLoading:
      (canPick && waves.isLoading) ||
      (canPutaway && putaways.isLoading) ||
      counts.isLoading,
    isError: waves.isError || putaways.isError || counts.isError,
    // Denied is its own answer, not an empty queue. A picker who has lost a
    // permission sees "you may not do this" rather than "there is nothing to do",
    // which is the defect the route-state check exists for.
    isDenied: !canPick && !canPutaway && !canCount,
    refetch: () => {
      void waves.refetch();
      void putaways.refetch();
      void counts.refetch();
    },
  };
}
