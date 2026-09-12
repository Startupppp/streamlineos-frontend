import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import { statusToneClasses, typeScaleClass } from "@/lib/design-tokens";
import type { BarcodeLookupResult, ScanCaptureResult } from "@/hooks/api/inventory/scan";

interface LookupSummary {
  kind: string;
  title: string;
  subtitle: string | null;
  href: string | null;
}

/**
 * The lookup branch, rendered from the fields the endpoint actually sends.
 *
 * This page previously declared `productName` / `variantSku` / `locationName`,
 * none of which any response has ever carried, so every result row rendered
 * `undefined`. The names below match
 * `backend/.../barcode/dto/inv-barcode.schemas.ts` exactly.
 */
function summariseLookup(lookup: BarcodeLookupResult): LookupSummary | null {
  switch (lookup.type) {
    case "product":
      return {
        kind: "Product",
        title: lookup.name,
        subtitle: `SKU ${lookup.sku} · ${lookup.totalOnHand} on hand`,
        href: `/inventory/products/${lookup.productId}`,
      };
    case "variant":
      return {
        kind: "Variant",
        title: lookup.name,
        subtitle: `SKU ${lookup.sku} · ${lookup.totalOnHand} on hand`,
        href: `/inventory/products/${lookup.productId}`,
      };
    case "lot":
      return {
        kind: "Lot",
        title: lookup.lotNumber,
        subtitle: lookup.status,
        href: `/inventory/lots/${lookup.lotId}`,
      };
    case "serial":
      return {
        kind: "Serial",
        title: lookup.serialNumber,
        subtitle: lookup.status,
        href: `/inventory/serials/${lookup.serialId}`,
      };
    case "location":
      return {
        kind: "Location",
        title: lookup.name,
        subtitle: `Bin ${lookup.code} · ${lookup.locationType}`,
        href: `/inventory/warehouses/${lookup.warehouseId}`,
      };
    case "not_found":
      return null;
  }
}

/** The GS1 branch, where the label names several things at once. */
function summariseScan(result: ScanCaptureResult): LookupSummary | null {
  if (result.variant)
    return {
      kind: "Variant",
      title: result.variant.name,
      subtitle: `SKU ${result.variant.sku}${result.variant.isActive ? "" : " · inactive"}`,
      href: `/inventory/products/${result.variant.productId}`,
    };
  if (result.serial)
    return {
      kind: "Serial",
      title: result.serial.serialNumber,
      subtitle: result.serial.status,
      href: `/inventory/serials/${result.serial.id}`,
    };
  if (result.lot)
    return {
      kind: "Lot",
      title: result.lot.lotNumber,
      subtitle: result.lot.expiryDate ? `Expires ${result.lot.expiryDate}` : result.lot.status,
      href: `/inventory/lots/${result.lot.id}`,
    };
  return result.lookup ? summariseLookup(result.lookup) : null;
}

export function ScanResultCard({ result }: { result: ScanCaptureResult }) {
  const summary = summariseScan(result);
  const warning = statusToneClasses("warning");
  const info = statusToneClasses("info");

  return (
    <div className={cn(CONTENT_PANEL_SOLID, "flex flex-col gap-2 p-3")}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="h-5 px-2 py-0.5 text-micro">
          {result.parsed.isGs1 ? "GS1 label" : "Plain barcode"}
        </Badge>
        {result.captured ? null : (
          <span className={cn("rounded px-1.5", info.surface, info.ink, typeScaleClass("micro"))}>
            Already recorded
          </span>
        )}
        {result.parsed.gtin ? (
          <span className={typeScaleClass("dense")}>GTIN {result.parsed.gtin}</span>
        ) : null}
        {result.parsed.expiryDate ? (
          <span className={typeScaleClass("dense")}>Expires {result.parsed.expiryDate}</span>
        ) : null}
      </div>

      {summary ? (
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={cn("text-muted-foreground", typeScaleClass("micro"))}>{summary.kind}</p>
            <TruncatedText text={summary.title} className="text-sm font-semibold" />
            {summary.subtitle ? (
              <p className={cn("text-muted-foreground", typeScaleClass("dense"))}>
                {summary.subtitle}
              </p>
            ) : null}
          </div>
          {summary.href ? (
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link href={summary.href}>Open</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <p className={cn("text-muted-foreground", typeScaleClass("dense"))}>
          Nothing in the catalogue carries this code.
        </p>
      )}

      {result.warnings.length > 0 ? (
        <ul
          className={cn(
            "flex flex-col gap-1 rounded-md border px-2 py-1.5",
            warning.surface,
            warning.ink,
            warning.rule,
            typeScaleClass("dense"),
          )}
        >
          {result.warnings.map((message: string) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}

      <p className={cn("break-all text-muted-foreground", typeScaleClass("micro"))}>
        Raw: {result.parsed.raw}
      </p>
    </div>
  );
}
