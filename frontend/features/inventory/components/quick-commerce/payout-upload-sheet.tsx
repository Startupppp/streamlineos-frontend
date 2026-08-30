"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { AppSheet } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  useUploadPayout,
  type QuickCommerceProvider,
} from "@/hooks/api/inventory/quick-commerce";

interface PayoutUploadSheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

interface ParsedPayoutLine {
  providerPoNumber?: string;
  providerSku?: string;
  ean?: string;
  quantity: string;
  amountPaise: number;
}

/**
 * NEO-3 - a platform payout file, pasted.
 *
 * Uploaded rather than fetched because there is no connected account, and pasted
 * rather than file-picked because a settlement export is a few hundred rows of
 * CSV and a file input would add an upload path for no gain. Parsing happens
 * here and the server re-validates every field: this is convenience, never the
 * boundary.
 */
export function PayoutUploadSheet({ open, onOpenChange }: PayoutUploadSheetProps) {
  const upload = useUploadPayout();

  const [provider, setProvider] = useState<QuickCommerceProvider>("BLINKIT");
  const [payoutRef, setPayoutRef] = useState("");
  const [settledOn, setSettledOn] = useState("");
  const [csv, setCsv] = useState("");

  const handleUpload = useCallback(() => {
    if (payoutRef.trim() === "") {
      toast.error("Enter the platform's settlement reference");
      return;
    }

    const { lines, errors } = parseCsv(csv);
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }
    if (lines.length === 0) {
      toast.error("Paste at least one payout line");
      return;
    }

    upload.mutate(
      {
        provider,
        payoutRef: payoutRef.trim(),
        settledOn: settledOn === "" ? undefined : settledOn,
        lines,
      },
      {
        onSuccess: (result) => {
          toast.success(
            `${result.stored} line(s) stored, ${result.unmatched} unmatched` +
              (result.duplicatesIgnored > 0
                ? `, ${result.duplicatesIgnored} already on file`
                : ""),
          );
          setCsv("");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [csv, payoutRef, provider, settledOn, upload]);

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Upload payout file"
      className="sm:max-w-2xl"
    >
      <div className="p-6 space-y-4">
        <p className="text-xs text-muted-foreground">
          Records what a platform says it settled, so fill rate can be compared against it. It
          posts nothing to the general ledger and is not a bank reconciliation. Re-uploading the
          same file is a no-op.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="payout-provider">Platform</Label>
            <Select
              value={provider}
              onValueChange={(v) => setProvider(v as QuickCommerceProvider)}
            >
              <SelectTrigger id="payout-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BLINKIT">Blinkit</SelectItem>
                <SelectItem value="INSTAMART">Instamart</SelectItem>
                <SelectItem value="ZEPTO">Zepto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payout-ref">Settlement reference</Label>
            <Input
              id="payout-ref"
              value={payoutRef}
              onChange={(e) => setPayoutRef(e.target.value)}
              placeholder="e.g. STL-2026-08-4471"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payout-date">Settled on</Label>
            <Input
              id="payout-date"
              type="date"
              value={settledOn}
              onChange={(e) => setSettledOn(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="payout-csv">Lines</Label>
          <Textarea
            id="payout-csv"
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={12}
            className="font-mono text-xs"
            placeholder={"po_number,sku,ean,qty,amount\nBLK-PO-88213,BLK-SKU-1,8901234567894,118,10903.20"}
          />
          <p className="text-dense text-muted-foreground">
            One line per settlement row: purchase order, SKU, EAN, quantity, amount in rupees. A
            header row is optional.
          </p>
        </div>

        <LoadingButton onClick={handleUpload} isPending={upload.isPending} loadingText="Uploading…">
          Upload
        </LoadingButton>
      </div>
    </AppSheet>
  );
}

const QTY = /^\d{1,14}(\.\d{1,4})?$/;
const RUPEES = /^-?\d{1,12}(\.\d{1,2})?$/;

/**
 * Rupees to integer paise, without a float.
 *
 * `Math.round(Number("41.99") * 100)` is 4199 today and is the kind of line that
 * quietly becomes 4198 for some other value. A payout is money; split the string.
 */
function paiseFromRupees(text: string): number | null {
  const match = /^(-?)(\d{1,12})(?:\.(\d{1,2}))?$/.exec(text.trim());
  if (!match) return null;
  const sign = match[1] === "-" ? -1 : 1;
  const rupees = Number(match[2]);
  const paise = Number((match[3] ?? "0").padEnd(2, "0"));
  return sign * (rupees * 100 + paise);
}

function parseCsv(text: string): { lines: ParsedPayoutLine[]; errors: string[] } {
  const rows = text
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter((row) => row !== "");

  const lines: ParsedPayoutLine[] = [];
  const errors: string[] = [];

  for (const [index, row] of rows.entries()) {
    const cells = row.split(",").map((cell) => cell.trim());
    // A header row is optional, so it is skipped by shape rather than by
    // position: the last two columns of a data row are always numbers.
    if (cells.length < 5) {
      errors.push(`Line ${index + 1}: expected po_number, sku, ean, qty, amount`);
      break;
    }
    const [poNumber, sku, ean, qty, amount] = cells;
    if (!QTY.test(qty ?? "") || !RUPEES.test(amount ?? "")) {
      if (index === 0) continue;
      errors.push(`Line ${index + 1}: "${qty}" and "${amount}" are not a quantity and an amount`);
      break;
    }
    const amountPaise = paiseFromRupees(amount ?? "");
    if (amountPaise === null) {
      errors.push(`Line ${index + 1}: "${amount}" is not an amount`);
      break;
    }
    if (!sku && !ean) {
      errors.push(`Line ${index + 1}: a payout line must name a SKU or an EAN`);
      break;
    }
    lines.push({
      providerPoNumber: poNumber || undefined,
      providerSku: sku || undefined,
      ean: ean || undefined,
      quantity: Number(qty).toFixed(4),
      amountPaise,
    });
  }

  return { lines, errors };
}
