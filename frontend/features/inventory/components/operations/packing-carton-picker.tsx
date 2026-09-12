"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { Label } from "@/components/ui/label";
import { statusToneClasses, typeScaleClass } from "@/lib/design-tokens";
import type { CartonSuggestion } from "@/hooks/api/inventory/packing";

interface PackingCartonPickerProps {
  suggestion: CartonSuggestion | null;
  isSuggesting: boolean;
  canSuggest: boolean;
  cartonTypeId: string;
  onCartonTypeChange: (value: string) => void;
  onSuggest: () => void;
}

/**
 * INV-206 at the bench.
 *
 * The service is advisory and says so: it checks weight and the longest edge,
 * because those are the two ways a wrong answer is expensive, and it declines to
 * recommend anything at all when an item has no measurements. All three of those
 * facts are shown rather than smoothed over — a packer told "SMALL" by a system
 * that had no dimensions for half the order would trust it exactly once.
 */
export function PackingCartonPicker({
  suggestion,
  isSuggesting,
  canSuggest,
  cartonTypeId,
  onCartonTypeChange,
  onSuggest,
}: PackingCartonPickerProps) {
  const candidates = suggestion?.candidates ?? [];
  const unmeasured = suggestion?.unmeasuredVariantIds.length ?? 0;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className={cn("font-medium", typeScaleClass("label"))}>Carton</Label>
        <LoadingButton
          type="button"
          size="sm"
          variant="outline"
          isPending={isSuggesting}
          loadingText="Measuring…"
          disabled={!canSuggest}
          onClick={onSuggest}
        >
          Suggest a box
        </LoadingButton>
      </div>

      {suggestion ? (
        <p className={cn("text-muted-foreground", typeScaleClass("dense"))}>
          {suggestion.recommended
            ? `Smallest box that works: ${suggestion.recommended.name}.`
            : unmeasured > 0
              ? `${unmeasured} item${unmeasured === 1 ? "" : "s"} have no measurements, so no box can be recommended — choose one yourself.`
              : "Nothing in the catalogue holds these contents."}
        </p>
      ) : null}

      <Select value={cartonTypeId} onValueChange={onCartonTypeChange} disabled={candidates.length === 0}>
        <SelectTrigger className="border-input bg-card">
          <SelectValue placeholder={candidates.length === 0 ? "Ask for a suggestion first" : "Choose a carton"} />
        </SelectTrigger>
        <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
          {candidates.map((candidate) => (
            <SelectItem key={candidate.cartonTypeId} value={String(candidate.cartonTypeId)}>
              {candidate.name} · {candidate.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {candidates.length > 0 ? (
        <ul className="space-y-1">
          {candidates.map((candidate) => {
            const tone = statusToneClasses(candidate.fits ? "success" : "danger");
            return (
              <li key={candidate.cartonTypeId} className="flex items-start gap-2">
                <Badge
                  variant="outline"
                  className={cn("h-5 shrink-0 px-2 py-0.5", typeScaleClass("micro"), tone.surface, tone.ink, tone.rule)}
                >
                  {candidate.fits ? "Fits" : "No"}
                </Badge>
                <span className={cn("min-w-0", typeScaleClass("dense"))}>
                  <span className="font-medium">{candidate.name}</span>
                  {candidate.reasons.length > 0 ? (
                    <span className="text-muted-foreground"> — {candidate.reasons.join("; ")}</span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
