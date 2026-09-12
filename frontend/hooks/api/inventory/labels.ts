"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";
import { variantLabelContract } from "./restored-surfaces-schema";

const variantLabelResponse = lazyContract<VariantLabel>(() => Promise.resolve(variantLabelContract as unknown as import("zod").ZodType<VariantLabel>));

/** The exact key both label routes and both document routes declare. */
export const LABELS_PRINT_KEY = "inventory:labels:print" as const;

export interface VariantLabel {
  productVariantId: number;
  productId: number;
  productName: string;
  variantName: string;
  sku: string;
  /** The value `GET /inventory/barcode/lookup` resolves. */
  code: string;
  codeSource: "barcode" | "sku";
  uom: string | null;
  lot: {
    lotId: number;
    lotNumber: string;
    expiryDate: string | null;
    manufactureDate: string | null;
  } | null;
  /** GS1-128 element string, or null where the variant carries no GTIN. */
  gs1: string | null;
  /** PNG data URI encoding `gs1 ?? code`. */
  qrDataUri: string;
  printedAt: string;
  organizationName: string;
}

/**
 * G4 — the label payload for one SKU, optionally for one batch of it.
 *
 * The server resolves the content and guarantees the code scans back to these
 * goods; what to print it on, at what size, and how many times is decided here.
 * `qrDataUri` is a PNG data URI, so it renders in an `<img>` with no library.
 *
 * `GET /inventory/labels/variants/:productVariantId` is still served. Restored
 * after a mutation-guard sweep deleted it — it is a query, so that sweep could
 * not legitimately have flagged it — and a second sweep then deleted the key it
 * reads as unreferenced. It now carries the gate its route declares, and the
 * abort signal the read always should have threaded.
 */
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
    // A label is a snapshot of catalogue data that barely moves, and a stale one
    // is worse than a slow one — it goes on a box.
    staleTime: 60_000,
    ...options,
    enabled: canPrint && !!productVariantId && (options?.enabled ?? true),
  });
}

/**
 * G4 — fetching a PDF the app is allowed to see.
 *
 * A plain `<a href="/inventory/labels/…/pdf">` cannot work here and it is worth
 * saying why, because it looks like it should: the API authenticates with a
 * bearer token that lives in memory, and a browser navigation carries cookies
 * only. The link would arrive with no `Authorization` header, the route would
 * 401, and the user would get a downloaded file containing an error envelope —
 * which reads as "the PDF is corrupt" rather than "you were not signed in".
 *
 * `apiClient.download` performs the fetch with the token attached and hands back
 * a Blob; the object URL is what the anchor points at.
 */
async function savePdf(blob: Blob, filename: string): Promise<void> {
  // The magic bytes, checked before anything is saved. An error body that got
  // this far would otherwise be written to disk under a .pdf name.
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

/** The goods received note for one receipt, as a PDF. */
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
