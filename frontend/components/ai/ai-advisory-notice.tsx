import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Ticket 03. The advisory that rides an AI result used to be a bare "⚠"
 * prepended to the result text. A glyph rendered from the text stream is at the
 * mercy of whichever emoji font the viewer has, carries no accessible name, and
 * inherits the paragraph's colour rather than a warning tone — so it read as a
 * stray character in some themes and as nothing at all to a screen reader.
 *
 * This is the product's own icon set, tokenised for both themes, with the icon
 * hidden from assistive technology and the notice announced by its role and its
 * words instead.
 */
export function AiAdvisoryNotice({
  advisory,
  className,
}: {
  advisory: string;
  className?: string;
}) {
  return (
    <p
      role="note"
      className={cn(
        "flex items-start gap-2 rounded-md border border-status-warning-rule bg-status-warning-surface px-2.5 py-2 text-dense text-status-warning-ink",
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0">{advisory}</span>
    </p>
  );
}
