"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AppDialog } from "@/components/shared";
import { cn } from "@/lib/utils";
import { statusToneClasses, typeScaleClass } from "@/lib/design-tokens";

interface ScanCameraDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (payload: string) => void;
}

/** Roughly six looks per second. A scan that needs more than that needs a scanner. */
const DETECT_INTERVAL_MS = 160;

/**
 * B2, item 1 — the camera, where the browser has one.
 *
 * A phone camera is slower and less reliable than a wedge, which is why it is
 * the third input rather than the first: the manual field is the fallback that
 * always works, and this is a convenience for an operator holding a phone and
 * no scanner. It never becomes the only way in, so a browser without
 * `BarcodeDetector` loses nothing.
 *
 * The stream is stopped on every exit path. A camera left running behind a
 * closed dialog keeps the indicator light on, which operators reasonably read as
 * the app watching them.
 */
export function ScanCameraDialog({ open, onOpenChange, onDetected }: ScanCameraDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const onDetectedRef = useRef(onDetected);

  useEffect(
    function keepCallbackCurrent() {
      onDetectedRef.current = onDetected;
    },
    [onDetected],
  );

  useEffect(
    function runCamera() {
      if (!open) return;

      // Captured now, not in the cleanup: by the time this unwinds the ref may
      // already point somewhere else, and the stream would outlive the dialog.
      const video = videoRef.current;
      let stream: MediaStream | null = null;
      let timer: ReturnType<typeof setInterval> | null = null;
      let cancelled = false;

      async function start(): Promise<void> {
        const detectorFactory = window.BarcodeDetector;
        if (!detectorFactory) {
          setError("This browser cannot read barcodes from the camera.");
          return;
        }
        setError(null);
        const detector = new detectorFactory();
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false,
          });
          if (cancelled || !video) return;
          video.srcObject = stream;
          await video.play();
          timer = setInterval(function look() {
            if (video.readyState < 2) return;
            void detector
              .detect(video)
              .then((codes) => {
                const first = codes[0];
                if (!first || cancelled) return;
                cancelled = true;
                onDetectedRef.current(first.rawValue);
              })
              .catch(() => {
                // A frame that will not decode is the normal case, not an error.
              });
          }, DETECT_INTERVAL_MS);
        } catch {
          if (!cancelled)
            setError("The camera is unavailable. Allow camera access, or type the code instead.");
        }
      }

      void start();

      return function stopCamera() {
        cancelled = true;
        if (timer !== null) clearInterval(timer);
        if (stream) for (const track of stream.getTracks()) track.stop();
        if (video) video.srcObject = null;
      };
    },
    [open],
  );

  function handleClose(): void {
    onOpenChange(false);
  }

  const danger = statusToneClasses("danger");

  return (
    <AppDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Scan with the camera"
      description="Hold the label inside the frame. The first code read is used."
      footer={
        <Button variant="outline" size="sm" onClick={handleClose}>
          Cancel
        </Button>
      }
    >
      {error ? (
        <p className={cn("rounded-md border px-3 py-2", danger.surface, danger.ink, danger.rule)}>
          {error}
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-muted">
          <video
            ref={videoRef}
            playsInline
            muted
            aria-label="Camera preview"
            className="aspect-video w-full object-cover"
          />
        </div>
      )}
      <p className={cn("mt-2 text-muted-foreground", typeScaleClass("dense"))}>
        Camera reads are slower than a wedge. Typing the code is always available.
      </p>
    </AppDialog>
  );
}
