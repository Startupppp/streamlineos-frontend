"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";

export type GenealogyNodeKind = "lot" | "serial" | "document";
export type GenealogyDirection = "forward" | "backward" | "both";
export type GenealogyTruncationReason =
  | "MAX_DEPTH"
  | "MAX_NODES"
  | "MAX_EDGES"
  | "MAX_FANOUT"
  | "WAREHOUSE_SCOPE";

export interface GenealogyNode {
  key: string;
  kind: GenealogyNodeKind;
  label: string;
  depth: number;
  lotId: number | null;
  serialId: number | null;
  referenceType: string | null;
  referenceId: string | null;
  fanoutTruncated: boolean;
  unexplored: boolean;
}

export interface GenealogyEdge {
  from: string;
  to: string;
  kind: "MOVEMENT" | "CONTAINS";
  direction: "forward" | "backward";
  transactionId: number | null;
  transactionType: string | null;
  /** Decimal(18,4) as text. Never parsed to a float. */
  quantity: string | null;
  locationId: number | null;
  occurredAt: string | null;
  reversed: boolean;
  closesCycle: boolean;
}

export interface GenealogyGraph {
  anchor: {
    kind: "lot" | "serial";
    id: number;
    key: string;
    label: string;
    productVariantId: number;
    productName: string | null;
    sku: string | null;
  };
  caps: {
    direction: GenealogyDirection;
    maxDepth: number;
    maxNodes: number;
    maxFanout: number;
  };
  nodes: GenealogyNode[];
  edges: GenealogyEdge[];
  truncation: {
    complete: boolean;
    reasons: GenealogyTruncationReason[];
    depthReached: number;
    nodeCount: number;
    edgeCount: number;
    unexploredNodes: number;
    fanoutTruncatedNodes: string[];
  };
  corrections: { excludedFromWalk: boolean };
  warehouseScoped: boolean;
}

export interface GenealogyParams {
  lotId?: number;
  serialId?: number;
  direction?: GenealogyDirection;
  maxDepth?: number;
  maxNodes?: number;
  maxFanout?: number;
  includeReversed?: boolean;
  [key: string]: unknown;
}

/**
 * D1. The bounded genealogy graph around one lot or serial.
 *
 * The server caps depth, breadth and total nodes and reports in
 * `truncation` whether those caps cut the answer short — so a partial recall
 * trace can never be rendered as a complete one. The caps travel in the query
 * key, because a graph walked to depth 2 is a different answer from the same
 * lot walked to depth 6.
 */
export function useLotGenealogy(
  params: GenealogyParams,
  options?: Omit<UseQueryOptions<GenealogyGraph, Error>, "queryKey" | "queryFn">,
) {
  const canView = useCan("inventory:stock:read");
  const hasAnchor = params.lotId !== undefined || params.serialId !== undefined;
  return useQuery<GenealogyGraph, Error>({
    queryKey: queryKeys.genealogy.graph(params),
    queryFn: () =>
      apiClient.get<GenealogyGraph>("/inventory/traceability/genealogy", {
        lotId: params.lotId,
        serialId: params.serialId,
        direction: params.direction,
        maxDepth: params.maxDepth,
        maxNodes: params.maxNodes,
        maxFanout: params.maxFanout,
        includeReversed: params.includeReversed === true ? "true" : undefined,
      }),
    staleTime: 60_000,
    ...options,
    enabled: canView && hasAnchor && (options?.enabled ?? true),
  });
}
