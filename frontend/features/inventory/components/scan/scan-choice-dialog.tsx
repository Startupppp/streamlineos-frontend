"use client";

import { Button } from "@/components/ui/button";
import { AppDialog } from "@/components/shared";
import { cn } from "@/lib/utils";
import { statusToneClasses, typeScaleClass } from "@/lib/design-tokens";
import { describeScan } from "@/features/inventory/lib/scan-resolution";
import type { ScanCandidateLabel, ScanChoice } from "@/features/inventory/hooks/use-scan-target";

interface ScanChoiceDialogProps<T> {
  choice: ScanChoice<T> | null;
  describe: (candidate: T) => ScanCandidateLabel;
  onChoose: (candidate: T) => void;
  onCancel: () => void;
}

/**
 * B2, item 3 — the scan the client is not allowed to settle on its own.
 *
 * Two things arrive here. A label that names goods appearing twice on the
 * document — the same SKU at two bins, or two lines of one order — where
 * picking the first would post against a row nobody chose. And a label whose
 * parts disagree: a lot that belongs to a different variant than the GTIN
 * printed beside it, or a printed expiry that is not the recorded one. Both are
 * shown as they are, and neither proceeds without a tap.
 */
export function ScanChoiceDialog<T>({
  choice,
  describe,
  onChoose,
  onCancel,
}: ScanChoiceDialogProps<T>) {
  function handleOpenChange(next: boolean): void {
    if (!next) onCancel();
  }

  const warning = statusToneClasses("warning");
  const ambiguous = (choice?.options.length ?? 0) > 1;

  return (
    <AppDialog
      open={choice !== null}
      onOpenChange={handleOpenChange}
      title={ambiguous ? "Which line was that?" : "Check this scan"}
      description={choice ? describeScan(choice.scan) : undefined}
      footer={
        <Button variant="outline" size="sm" onClick={onCancel}>
          Discard scan
        </Button>
      }
    >
      {choice ? (
        <div className="flex flex-col gap-3">
          {choice.warnings.length > 0 ? (
            <ul
              className={cn(
                "flex flex-col gap-1 rounded-md border px-3 py-2",
                warning.surface,
                warning.ink,
                warning.rule,
                typeScaleClass("dense"),
              )}
            >
              {choice.warnings.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          ) : null}

          <p className={cn("text-muted-foreground", typeScaleClass("dense"))}>
            {ambiguous
              ? "This label matches more than one line. Nothing is recorded until you pick one."
              : "The label and the record do not agree. Confirm the line to go ahead."}
          </p>

          <ul className="flex flex-col gap-2">
            {choice.options.map((candidate) => {
              const label = describe(candidate);
              return (
                <li key={label.key}>
                  <ScanChoiceRow label={label} candidate={candidate} onChoose={onChoose} />
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </AppDialog>
  );
}

/**
 * Extracted so the click handler is named rather than an arrow closed over the
 * map's candidate, which frontend §3 bans at the call site.
 */
function ScanChoiceRow<T>({
  label,
  candidate,
  onChoose,
}: {
  label: ScanCandidateLabel;
  candidate: T;
  onChoose: (candidate: T) => void;
}) {
  function handleClick(): void {
    onChoose(candidate);
  }

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      className="flex h-auto w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left"
    >
      <span className="w-full truncate text-sm font-medium">{label.primary}</span>
      {label.secondary ? (
        <span className={cn("w-full truncate text-muted-foreground", typeScaleClass("dense"))}>
          {label.secondary}
        </span>
      ) : null}
    </Button>
  );
}
