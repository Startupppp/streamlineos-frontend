"use client";

import * as React from "react";
import Link from "next/link";
import { WifiOff, Barcode, Clock } from "lucide-react";
import { SearchIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { useBarcodeLookup, type BarcodeLookupResult } from "@/hooks/api/inventory/admin";

interface RecentScan {
  code: string;
  resultType: string;
  timestamp: Date;
}

function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = React.useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  React.useEffect(function subscribeToOnlineStatus() {
    function handleOnline() {
      setIsOnline(true);
    }
    function handleOffline() {
      setIsOnline(false);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return function cleanup() {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  return isOnline;
}

function getResultType(result: BarcodeLookupResult | undefined): string {
  if (!result) return "unknown";
  return result.type;
}

function ResultCard({ result }: { result: BarcodeLookupResult }) {
  if (result.type === "not_found") {
    return (
      <Card>
        <CardContent className="py-6 text-center text-muted-foreground text-sm">
          No item found for this barcode.
        </CardContent>
      </Card>
    );
  }

  if (result.type === "product") {
    return (
      <Card>
        <CardContent className="py-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Product</p>
            <p className="font-semibold text-sm">{result.productName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">SKU: {result.sku}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link
              href={`/inventory/products/${result.productId}`}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 text-xs h-8 hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              View Product
            </Link>
            <Link
              href={`/inventory/stock?sku=${encodeURIComponent(result.sku)}`}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 text-xs h-8 hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              View Stock
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (result.type === "variant") {
    return (
      <Card>
        <CardContent className="py-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Variant</p>
            <p className="font-semibold text-sm">{result.productName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">SKU: {result.variantSku}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link
              href={`/inventory/products/${result.variantId}`}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 text-xs h-8 hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              View Product
            </Link>
            <Link
              href={`/inventory/stock?sku=${encodeURIComponent(result.variantSku)}`}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 text-xs h-8 hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              View Stock
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (result.type === "lot") {
    return (
      <Card>
        <CardContent className="py-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Lot</p>
            <p className="font-semibold text-sm">{result.lotNumber}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {result.productName} · {result.variantSku}
            </p>
          </div>
          <Link
            href={`/inventory/lots/${result.lotId}`}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 text-xs h-8 hover:bg-accent hover:text-accent-foreground transition-colors shrink-0"
          >
            View Lot
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (result.type === "serial") {
    return (
      <Card>
        <CardContent className="py-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Serial</p>
            <p className="font-semibold text-sm">{result.serialNumber}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {result.productName} · {result.variantSku}
            </p>
          </div>
          <Link
            href={`/inventory/serials/${result.serialId}`}
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 text-xs h-8 hover:bg-accent hover:text-accent-foreground transition-colors shrink-0"
          >
            View Serial
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (result.type === "location") {
    return (
      <Card>
        <CardContent className="py-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-0.5">Location</p>
            <p className="font-semibold text-sm">{result.locationName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{result.warehouseName}</p>
          </div>
          <Link
            href="/inventory/warehouses"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 text-xs h-8 hover:bg-accent hover:text-accent-foreground transition-colors shrink-0"
          >
            View Warehouse
          </Link>
        </CardContent>
      </Card>
    );
  }

  return null;
}

interface BarcodeResultSectionProps {
  code: string;
}

function BarcodeResultSection({ code }: BarcodeResultSectionProps) {
  const { data, isLoading, isError, error } = useBarcodeLookup(code);

  if (!code) return null;

  if (isLoading) {
    return <Skeleton className="h-20 w-full rounded-xl" />;
  }

  if (isError || !data) {
    toast.error(getErrorMessage(error));
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-destructive">
          Failed to look up barcode. Please try again.
        </CardContent>
      </Card>
    );
  }

  return <ResultCard result={data} />;
}

export function BarcodeClient() {
  const isOnline = useOnlineStatus();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = React.useState("");
  const [activeCode, setActiveCode] = React.useState("");
  const [recentScans, setRecentScans] = React.useState<RecentScan[]>([]);
  const [isPending, setIsPending] = React.useState(false);
  const { data: lookupData } = useBarcodeLookup(activeCode);
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  React.useEffect(function focusInput() {
    inputRef.current?.focus();
  }, []);

  React.useEffect(
    function recordRecentScan() {
      if (!activeCode || !lookupData) return;
      setIsPending(false);
      setRecentScans((prev) => {
        const entry: RecentScan = {
          code: activeCode,
          resultType: getResultType(lookupData),
          timestamp: new Date(),
        };
        return [entry, ...prev].slice(0, 10);
      });
    },
    [activeCode, lookupData],
  );

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>): void {
    setInputValue(e.target.value);
  }

  function submitCode(trimmed: string): void {
    if (!trimmed || !isOnline) return;
    setIsPending(true);
    setActiveCode(trimmed);
    setInputValue("");
  }

  function handleSubmit(e: React.FormEvent): void {
    e.preventDefault();
    submitCode(inputValue.trim());
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "Enter") {
      submitCode(inputValue.trim());
    }
  }

  return (
    <PageWrapper
      eyebrow="Operations · Inventory"
      title="Barcode Lookup"
      subtitle="Scan or enter a barcode to look up inventory items."
    >
      <div className="max-w-xl mx-auto space-y-4">
        {!isOnline && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-amber-800 text-sm">
            <WifiOff className="h-4 w-4 shrink-0" />
            <span>You are offline. Barcode lookup is unavailable.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Scan or type a barcode…"
              disabled={!isOnline}
              className="pl-9"
              autoComplete="off"
            />
          </div>
          <LoadingButton
            type="submit"
            isPending={isPending && !lookupData}
            loadingText="Looking up…"
            disabled={!isOnline || !inputValue.trim()}
            {...hoverHandlers}
          >
            <SearchIcon ref={iconRef} size={14} className="mr-1" />
            Look up
          </LoadingButton>
        </form>

        {activeCode && <BarcodeResultSection code={activeCode} />}

        {recentScans.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              Recent scans
            </p>
            <div className="space-y-1">
              {recentScans.map(function renderScan(scan, idx) {
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm"
                  >
                    <span className="font-mono text-xs text-foreground truncate mr-3">
                      {scan.code}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-xs capitalize">
                        {scan.resultType}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {scan.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
