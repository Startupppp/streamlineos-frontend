"use client";

import { useRef, useState } from "react";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import { SCAN_PERMISSION, useCaptureScan } from "@/hooks/api/inventory/scan";
import { describeScan, resolveScan, type ResolvedScan } from "@/features/inventory/lib/scan-resolution";

/**
 * Longest gap between two identical payloads still treated as one physical act.
 *
 * A wedge on a flaky trigger sends the same label three times in a quarter of a
 * second. Two seconds is comfortably longer than that and comfortably shorter
 * than the time it takes to pick up the next unit, so a genuine second unit of
 * the same SKU still records a second fact.
 */
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
  /** The lines this scan is allowed to land on. Anything else fails closed. */
  candidates: readonly T[];
  match: (candidate: T, scan: ResolvedScan) => boolean;
  describe: (candidate: T) => ScanCandidateLabel;
  onResolved: (candidate: T, scan: ResolvedScan) => void;
  /** What the operator is holding: "receipt", "wave", "task", "carton", "count". */
  documentNoun: string;
  acceptedMessage?: (candidate: T, scan: ResolvedScan) => string;
  enabled?: boolean;
}

export interface ScanChoice<T> {
  scan: ResolvedScan;
  options: readonly T[];
  /** Why a single option still needs a tap: the label and the record disagree. */
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

/**
 * B2 — capture first, then decide what the scan may do.
 *
 * Three rules live here rather than in five operator screens, because all three
 * are the kind that gets forgotten exactly once and then costs a stock count.
 *
 * **Capture precedes the command.** The fact that a label was read is recorded
 * before anything acts on it, so a rejected putaway still leaves evidence the
 * pallet reached the door. The capture is idempotent on a key this hook owns:
 * an identical payload inside the duplicate window reuses the key, so the
 * server replays instead of writing a second fact, and the command does not run
 * at all. That is what stops a machine-gunning trigger double-posting.
 *
 * **Out of scope fails closed.** A scan that resolves to goods this document
 * does not name resolves to nothing at all here — no command, an explicit
 * refusal, and the operator still holding the unit. The alternative is a receipt
 * that quietly counts a pallet belonging to another order.
 *
 * **Ambiguity is the operator's to settle.** Two lines for the same SKU at two
 * bins is not a tie the client may break, and neither is a label whose lot
 * belongs to a different variant than its GTIN. Both stop and ask.
 */
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

  /**
   * Held in a ref, not state: the wedge fires several times inside one frame and
   * a state update would not have landed before the next payload arrives, so
   * every repeat would mint a fresh key and post again.
   */
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

    // The dialog becomes the message; leaving the previous scan's verdict under
    // it reads as an answer to a question the operator has not settled yet.
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

    /*
     * One capture at a time, and said out loud rather than dropped.
     *
     * The server's idempotency claim refuses a key it is still working on with a
     * 409, so firing the retry a trigger-happy wedge produces would turn a
     * duplicate into an error. Holding it here keeps the refusal off the screen —
     * but silently swallowing the scan would leave an operator believing a unit
     * was counted, which is the failure this whole shell exists to prevent.
     */
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
    const idempotencyKey = isRepeat ? previous.key : crypto.randomUUID();
    lastScan.current = { payload: trimmed, key: idempotencyKey, at: now };

    setChoice(null);
    capture.mutate(
      { payload: trimmed, idempotencyKey },
      {
        onSuccess: (result) => {
          const scan = resolveScan(result);
          // `captured: false` is the server saying it has seen this exact key
          // before. Either way the fact exists once and the command must not run
          // a second time.
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
          // Fail closed: a capture that did not land leaves no fact, so nothing
          // downstream may act as though it did.
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
