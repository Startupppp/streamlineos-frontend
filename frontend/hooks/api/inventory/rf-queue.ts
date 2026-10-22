"use client";

import { useMemo } from "react";
import { usePickWaves } from "@/hooks/api/inventory/picking";
import { usePutawayTasks } from "@/hooks/api/inventory/putaway";
import { useCycleCounts } from "@/hooks/api/inventory/counts";
import { useCan } from "@/hooks/api/access";

export type RfTaskKind = "PICK" | "PUTAWAY" | "COUNT";

export interface RfTask {
  kind: RfTaskKind;
  id: number;
  reference: string;
  summary: string;
  warehouseId: number | null;
  href: string;
}

export interface RfQueue {
  tasks: RfTask[];
  isLoading: boolean;
  isError: boolean;
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
    isDenied: !canPick && !canPutaway && !canCount,
    refetch: () => {
      void waves.refetch();
      void putaways.refetch();
      void counts.refetch();
    },
  };
}
