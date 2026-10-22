"use client";

import { useRef, useState } from "react";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { SCAN_PERMISSION, useCaptureScan } from "@/hooks/api/inventory/scan";
import { describeScan, resolveScan, type ResolvedScan } from "@/features/inventory/lib/scan-resolution";
import { randomId } from "@/lib/random-id";

const DUPLICATE_WINDOW_MS = 2_000;

export type ScanOutcome =
  | { kind: "idle" }
  | { kind: "duplicate"; message: string }
  | { kind: "rejected"; message: string }
  | { kind: "error"; message: string }
  | { kind: "accepted"; message: string };

export interface ScanCandidateLabel {
  key: string;
  primary: string;
  secondary?: string;
}

export interface UseScanTargetOptions<T> {
  candidates: readonly T[];
  match: (candidate: T, scan: ResolvedScan) => boolean;
  describe: (candidate: T) => ScanCandidateLabel;
  onResolved: (candidate: T, scan: ResolvedScan) => void;
  documentNoun: string;
  acceptedMessage?: (candidate: T, scan: ResolvedScan) => string;
  enabled?: boolean;
}

export interface ScanChoice<T> {
  scan: ResolvedScan;
  options: readonly T[];
  warnings: readonly string[];
}

export interface UseScanTargetResult<T> {
  submit: (payload: string) => void;
  outcome: ScanOutcome;
  isPending: boolean;
  canScan: boolean;
  choice: ScanChoice<T> | null;
  chooseCandidate: (candidate: T) => void;
  cancelChoice: () => void;
  describeCandidate: (candidate: T) => ScanCandidateLabel;
}

export function useScanTarget<T>(options: UseScanTargetOptions<T>): UseScanTargetResult<T> {
  const {
    candidates,
    match,
    describe,
    onResolved,
    documentNoun,
    acceptedMessage,
    enabled = true,
  } = options;

  const canScan = useCan(SCAN_PERMISSION);
  const capture = useCaptureScan();
  const [outcome, setOutcome] = useState<ScanOutcome>({ kind: "idle" });
  const [choice, setChoice] = useState<ScanChoice<T> | null>(null);

  const lastScan = useRef<{ payload: string; key: string; at: number } | null>(null);

  function accept(candidate: T, scan: ResolvedScan): void {
    setChoice(null);
    setOutcome({
      kind: "accepted",
      message: acceptedMessage
        ? acceptedMessage(candidate, scan)
        : `${describe(candidate).primary} — ${describeScan(scan)}`,
    });
    onResolved(candidate, scan);
  }

  function land(scan: ResolvedScan): void {
    if (scan.unknown) {
      setOutcome({
        kind: "rejected",
        message: `Nothing in the catalogue carries ${scan.raw}.`,
      });
      return;
    }

    const matches = candidates.filter((candidate) => match(candidate, scan));

    if (matches.length === 0) {
      setOutcome({
        kind: "rejected",
        message: `${describeScan(scan)} is not on this ${documentNoun}.`,
      });
      return;
    }

    if (matches.length > 1 || scan.warnings.length > 0) {
      setChoice({ scan, options: matches, warnings: scan.warnings });
      setOutcome({ kind: "idle" });
      return;
    }

    const only = matches[0];
    if (only === undefined) return;
    accept(only, scan);
  }

  function submit(payload: string): void {
    const trimmed = payload.trim();
    if (!trimmed || !enabled || !canScan) return;

    if (capture.isPending) {
      setOutcome({
        kind: "duplicate",
        message: "Still reading the last scan — scan again in a moment.",
      });
      return;
    }

    const now = Date.now();
    const previous = lastScan.current;
    const isRepeat =
      previous !== null && previous.payload === trimmed && now - previous.at < DUPLICATE_WINDOW_MS;
    const idempotencyKey = isRepeat ? previous.key : randomId();
    lastScan.current = { payload: trimmed, key: idempotencyKey, at: now };

    setChoice(null);
    capture.mutate(
      { payload: trimmed, idempotencyKey },
      {
        onSuccess: (result) => {
          const scan = resolveScan(result);
          if (isRepeat || !result.captured) {
            setOutcome({
              kind: "duplicate",
              message: `${describeScan(scan)} scanned again — counted once.`,
            });
            return;
          }
          land(scan);
        },
        onError: (error) => {
          setOutcome({ kind: "error", message: getErrorMessage(error) });
        },
      },
    );
  }

  function chooseCandidate(candidate: T): void {
    if (!choice) return;
    accept(candidate, choice.scan);
  }

  function cancelChoice(): void {
    setChoice(null);
    setOutcome({ kind: "rejected", message: "Scan dismissed — nothing was recorded against it." });
  }

  return {
    submit,
    outcome,
    isPending: capture.isPending,
    canScan,
    choice,
    chooseCandidate,
    cancelChoice,
    describeCandidate: describe,
  };
}
