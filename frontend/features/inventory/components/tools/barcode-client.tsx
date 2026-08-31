"use client";

import * as React from "react";
import Link from "next/link";
import { Clock, ScanBarcode, WifiOff } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptySearchIllustration } from "@/components/illustrations";
import { NoPermissionState } from "@/components/shared";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { statusToneClasses, typeScaleClass } from "@/lib/design-tokens";
import { useKeyboardWedge } from "@/hooks/common/use-keyboard-wedge";
import { useInventoryOutbox } from "@/hooks/api/inventory/offline-outbox";
import {
  SCAN_PERMISSION,
  useCaptureScan,
  type BarcodeLookupResult,
  type ScanCaptureResult,
} from "@/hooks/api/inventory/scan";
import { useCan } from "@/hooks/api/access";
import { describeScan, resolveScan } from "@/features/inventory/lib/scan-resolution";
import { randomId } from "@/lib/random-id";

interface RecentScan {
  key: string;
  raw: string;
  summary: string;
  at: Date;
}

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

function ScanResultCard({ result }: { result: ScanCaptureResult }) {
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

/**
 * B2 — the lookup bench, now recording what it reads.
 *
 * Every read here goes through `/scan/capture`, not `/scan`, for the same
 * reason the operator surfaces do: a scan is a fact about the building, and a
 * warehouse that can only reconstruct its scans from the movements they caused
 * has no record of the ones that caused none. The idempotency key is minted per
 * submission, so a retry of one read replays and a deliberate second read of the
 * same label records a second fact.
 */
export function BarcodeClient() {
  const canScan = useCan(SCAN_PERMISSION);
  const { isOnline } = useInventoryOutbox();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [value, setValue] = React.useState("");
  const [recent, setRecent] = React.useState<RecentScan[]>([]);
  const capture = useCaptureScan();

  const active = canScan && isOnline;

  function runScan(payload: string): void {
    const trimmed = payload.trim();
    if (!trimmed || !active) return;
    setValue("");
    capture.mutate(
      { payload: trimmed, idempotencyKey: randomId() },
      {
        onSuccess: (result) => {
          const entry: RecentScan = {
            key: `${Date.now()}-${result.parsed.raw}`,
            raw: result.parsed.raw,
            summary: describeScan(resolveScan(result)),
            at: new Date(),
          };
          setRecent((previous) => [entry, ...previous].slice(0, 10));
        },
      },
    );
  }

  useKeyboardWedge(runScan, { enabled: active });

  function handleChange(event: React.ChangeEvent<HTMLInputElement>): void {
    setValue(event.target.value);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    runScan(value);
  }

  const warning = statusToneClasses("warning");
  const danger = statusToneClasses("danger");

  return (
    <PageWrapper
      title="Barcode Lookup"
      subtitle="Scan or enter a barcode. Every read is recorded against this warehouse."
    >
      {!canScan ? (
        <NoPermissionState className="flex-1" permission={SCAN_PERMISSION} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          {!isOnline ? (
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm",
                warning.surface,
                warning.ink,
                warning.rule,
              )}
            >
              <WifiOff aria-hidden className="h-4 w-4 shrink-0" />
              <span>You are offline. Scans cannot be recorded until the connection returns.</span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
            <Label htmlFor="barcode-lookup" className={cn("font-medium", typeScaleClass("label"))}>
              Scan or type a code
            </Label>
            <div className="flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <ScanBarcode
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="barcode-lookup"
                  ref={inputRef}
                  value={value}
                  onChange={handleChange}
                  placeholder="Barcode, GTIN, SKU, lot, serial or bin"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  disabled={!active}
                  className="pl-9"
                />
              </div>
              <LoadingButton
                type="submit"
                isPending={capture.isPending}
                loadingText="Reading…"
                disabled={!active || value.trim().length === 0}
              >
                Look up
              </LoadingButton>
            </div>
          </form>

          <div role="status" aria-live="polite" className="flex flex-col gap-2">
            {capture.error ? (
              <p
                className={cn(
                  "rounded-md border px-3 py-2 text-sm",
                  danger.surface,
                  danger.ink,
                  danger.rule,
                )}
              >
                {getErrorMessage(capture.error)}
              </p>
            ) : null}
            {capture.data ? <ScanResultCard result={capture.data} /> : null}
          </div>

          {/*
           * G8 — the bench's own empty state.
           *
           * Before the first scan there is genuinely nothing to show, and a blank
           * area below the field reads as a page that failed to load. It says
           * what to do instead, and names the wedge as well as the box, because
           * the wedge needs no focus and an operator holding a scanner should not
           * be hunting for a cursor.
           */}
          {recent.length === 0 && !capture.data && !capture.error ? (
            <EmptyState
              className="flex-1 min-h-0"
              illustration={<EmptySearchIllustration />}
              title="Nothing scanned yet"
              description="Pull the trigger on a wedge scanner anywhere on this page, or type a code above. Every read is recorded against this warehouse."
            />
          ) : null}

          {recent.length > 0 ? (
            <section className="flex flex-col gap-2">
              <h2
                className={cn(
                  "flex items-center gap-1.5 font-medium text-muted-foreground",
                  typeScaleClass("label"),
                )}
              >
                <Clock aria-hidden className="h-3.5 w-3.5" />
                Recent scans
              </h2>
              <ul className="flex flex-col gap-1">
                {recent.map((entry) => (
                  <li
                    key={entry.key}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate font-mono text-micro">{entry.raw}</span>
                    <span className={cn("shrink-0 text-muted-foreground", typeScaleClass("dense"))}>
                      {entry.summary}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 font-mono tabular-nums text-muted-foreground",
                        typeScaleClass("micro"),
                      )}
                    >
                      {entry.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </PageWrapper>
  );
}
