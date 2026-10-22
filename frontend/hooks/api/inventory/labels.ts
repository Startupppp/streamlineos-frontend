"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";
const variantLabelResponse = lazyContract(() =>
  import("./restored-surfaces-schema").then((m) => m.variantLabelContract),
);

export const LABELS_PRINT_KEY = "inventory:labels:print" as const;

export interface VariantLabel {
  productVariantId: number;
  productId: number;
  productName: string;
  variantName: string;
  sku: string;
  code: string;
  codeSource: "barcode" | "sku";
  uom: string | null;
  lot: {
    lotId: number;
    lotNumber: string;
    expiryDate: string | null;
    manufactureDate: string | null;
  } | null;
  gs1: string | null;
  qrDataUri: string;
  printedAt: string;
  organizationName: string;
}

export function useVariantLabel(
  productVariantId: number | null,
  lotId?: number,
  options?: Omit<UseQueryOptions<VariantLabel, Error>, "queryKey" | "queryFn">,
) {
  const canPrint = useCan(LABELS_PRINT_KEY);
  return useQuery<VariantLabel, Error>({
    queryKey: queryKeys.inventory.variantLabel(productVariantId ?? 0, lotId),
    queryFn: ({ signal }) =>
      apiClient.get<VariantLabel>(
        `/inventory/labels/variants/${productVariantId ?? 0}`,
        lotId ? { lotId: String(lotId) } : undefined,
        signal,
        variantLabelResponse,
      ),
    staleTime: 60_000,
    ...options,
    enabled: canPrint && !!productVariantId && (options?.enabled ?? true),
  });
}

async function savePdf(blob: Blob, filename: string): Promise<void> {
  const header = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
  const isPdf =
    header.length >= 5 &&
    header[0] === 0x25 &&
    header[1] === 0x50 &&
    header[2] === 0x44 &&
    header[3] === 0x46 &&
    header[4] === 0x2d;
  if (!isPdf) throw new Error("The document did not come back as a PDF. Please try again.");

  const pdf = blob.type === "application/pdf" ? blob : new Blob([blob], { type: "application/pdf" });
  const url = URL.createObjectURL(pdf);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function useDownloadGrnNote() {
  return useAuthorizedMutation<void, Error, { grnId: number; grnNumber?: string }>(
    "inventory:labels:print",
    {
      mutationKey: ["inventory", "labels", "grn-note"],
      mutationFn: async ({ grnId, grnNumber }) => {
        const blob = await apiClient.download(`/inventory/labels/goods-receipts/${grnId}/pdf`);
        const name = grnNumber ?? `grn-${grnId}`;
        await savePdf(blob, `${name}.pdf`);
      },
    },
  );
}
