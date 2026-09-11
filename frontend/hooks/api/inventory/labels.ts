"use client";

import { apiClient } from "@/lib/api-client";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

/** The exact key both label routes and both document routes declare. */
export const LABELS_PRINT_KEY = "inventory:labels:print" as const;

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
