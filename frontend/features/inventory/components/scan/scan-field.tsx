"use client";

import dynamic from "next/dynamic";
import { useId, useRef, useState, useSyncExternalStore } from "react";
import { Camera, ScanBarcode, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { cn } from "@/lib/utils";
import { statusToneClasses, typeScaleClass, type StatusTone } from "@/lib/design-tokens";
import { useKeyboardWedge } from "@/hooks/common/use-keyboard-wedge";
import { useInventoryOutbox } from "@/hooks/api/inventory/offline-outbox";
import type { ScanOutcome, UseScanTargetResult } from "@/features/inventory/hooks/use-scan-target";
import { ScanChoiceDialog } from "./scan-choice-dialog";

const ScanCameraDialog = dynamic(
  () => import("./scan-camera-dialog").then((m) => m.ScanCameraDialog),
  { ssr: false },
);

interface ScanFieldProps<T> {
  scan: UseScanTargetResult<T>;
  /** What a scan will do here, e.g. "Scan a unit to count it". */
  label: string;
  placeholder?: string;
  /** Bleeds to the sheet edges and pins to the top of the scrolling body. */
  sticky?: boolean;
  disabled?: boolean;
  className?: string;
}

const OUTCOME_TONE: Record<Exclude<ScanOutcome["kind"], "idle">, StatusTone> = {
  accepted: "success",
  duplicate: "info",
  rejected: "warning",
  error: "danger",
};

/**
 * Whether this browser can decode a barcode from a camera frame.
 *
 * Read through `useSyncExternalStore` rather than an effect, because the answer
 * differs between the server render (never) and the client (sometimes), and that
 * is exactly the mismatch this hook exists to reconcile. It never changes within
 * a session, so there is nothing to subscribe to.
 */
const NO_SUBSCRIPTION = () => () => undefined;

function readCameraSupport(): boolean {
  return (
    window.BarcodeDetector !== undefined &&
    typeof navigator.mediaDevices?.getUserMedia === "function"
  );
}

function noCameraOnServer(): boolean {
  return false;
}

/**
 * B2, item 1 — the one scan input every operator surface uses.
 *
 * Three ways in, in the order they are reliable. A **wedge** is the real one and
 * needs no focus: warehouse operators scan while the page has focus wherever it
 * happens to be, so the listener is on the document and tells hardware from a
 * person by keystroke speed. The **text field** is the accessible equivalent and
 * the fallback for a label that will not read — it is a real labelled control,
 * not a hidden trap for the scanner, so it works with a keyboard and a screen
 * reader alone. The **camera** appears only where the browser can decode one.
 *
 * Every outcome is announced rather than only coloured. A picker holding a unit
 * is not looking at the screen when the beep happens, and "rejected" and
 * "already counted" are the two answers that must never be confused: one means
 * put it back, the other means carry on.
 */
export function ScanField<T>({
  scan,
  label,
  placeholder = "Scan or type a barcode, SKU, lot or serial",
  sticky = false,
  disabled = false,
  className,
}: ScanFieldProps<T>) {
  const fieldId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const { isOnline, counts } = useInventoryOutbox();
  const cameraSupported = useSyncExternalStore(
    NO_SUBSCRIPTION,
    readCameraSupport,
    noCameraOnServer,
  );

  const active = !disabled && scan.canScan && isOnline;

  useKeyboardWedge(
    function handleWedge(payload) {
      scan.submit(payload);
      setValue("");
    },
    { enabled: active && scan.choice === null },
  );

  function handleChange(event: React.ChangeEvent<HTMLInputElement>): void {
    setValue(event.target.value);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    scan.submit(value);
    setValue("");
  }

  function handleOpenCamera(): void {
    setCameraOpen(true);
  }

  function handleCameraDetected(payload: string): void {
    setCameraOpen(false);
    scan.submit(payload);
    inputRef.current?.focus();
  }

  const { outcome } = scan;
  const tone = outcome.kind === "idle" ? null : statusToneClasses(OUTCOME_TONE[outcome.kind]);
  // B11, item 3 — denied, offline and queued have to read as three different
  // things. Denied hides the control entirely, offline says why it is inert, and
  // queued says the work is real but not yet with the server.
  const queued = counts.queued + counts.inFlight;

  if (!scan.canScan) return null;

  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        sticky &&
          "sticky top-0 z-10 -mx-5 border-b border-border/60 bg-card px-5 py-2 md:-mx-6 md:px-6",
        className,
      )}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
        <Label htmlFor={fieldId} className={cn("font-medium", typeScaleClass("label"))}>
          {label}
        </Label>
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <ScanBarcode
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id={fieldId}
              ref={inputRef}
              value={value}
              onChange={handleChange}
              placeholder={placeholder}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              enterKeyHint="done"
              disabled={!active}
              aria-describedby={`${fieldId}-status`}
              className="pl-9"
            />
          </div>
          {cameraSupported ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleOpenCamera}
              disabled={!active}
              aria-label="Scan with the camera"
            >
              <Camera className="h-4 w-4" />
            </Button>
          ) : null}
          <LoadingButton
            type="submit"
            isPending={scan.isPending}
            loadingText="Reading…"
            disabled={!active || value.trim().length === 0}
          >
            Scan
          </LoadingButton>
        </div>
      </form>

      <p
        id={`${fieldId}-status`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={cn(
          "min-h-5 rounded-md",
          typeScaleClass("dense"),
          tone ? cn("border px-2 py-1", tone.surface, tone.ink, tone.rule) : "text-muted-foreground",
        )}
      >
        {!isOnline ? (
          <span className="flex items-center gap-1.5">
            <WifiOff aria-hidden className="h-3.5 w-3.5 shrink-0" />
            Offline — scanning is paused until the connection returns.
            {queued > 0 ? ` ${queued} operation${queued === 1 ? "" : "s"} waiting to sync.` : null}
          </span>
        ) : outcome.kind === "idle" ? (
          queued > 0 ? (
            `Ready to scan. ${queued} earlier operation${queued === 1 ? "" : "s"} still syncing.`
          ) : (
            "Ready to scan."
          )
        ) : (
          outcome.message
        )}
      </p>

      <ScanChoiceDialog
        choice={scan.choice}
        describe={scan.describeCandidate}
        onChoose={scan.chooseCandidate}
        onCancel={scan.cancelChoice}
      />

      {cameraSupported ? (
        <ScanCameraDialog
          open={cameraOpen}
          onOpenChange={setCameraOpen}
          onDetected={handleCameraDetected}
        />
      ) : null}
    </div>
  );
}
