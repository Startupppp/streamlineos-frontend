"use client";

import { useCallback } from "react";
import { Building2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import { formatShortDate } from "@/lib/date-utils";
import type { DuplicateCandidateSide } from "@/types/party/merges";

/**
 * One of the two records, as a card the reviewer picks.
 *
 * Everything shown is a reason to choose or reject: the name, the address and
 * line the detector matched on, whether it is a person or a company, and how
 * old it is. The party id is never rendered — a UUID tells the reader nothing
 * about which business they are about to destroy (§5).
 */
export function DuplicatePartyCard({
  side,
  isSurvivor,
  onSelect,
}: {
  side: DuplicateCandidateSide;
  isSurvivor: boolean;
  onSelect: (partyId: string) => void;
}) {
  const handleClick = useCallback(() => onSelect(side.partyId), [onSelect, side.partyId]);
  const KindIcon = side.partyKind === "ORGANISATION" ? Building2 : User;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={isSurvivor}
      className={cn(
        "rounded-xl border p-4 text-left transition-colors",
        isSurvivor
          ? "border-primary bg-primary/5 ring-1 ring-primary"
          : "border-border/70 bg-card hover:border-primary/40",
      )}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <KindIcon className="h-4 w-4 text-primary" />
        </span>
        <div className="min-w-0 flex-1">
          <TruncatedText text={side.name} className="text-sm font-medium" />
          <p className="text-[11px] text-muted-foreground">
            Added {formatShortDate(side.createdAt)}
          </p>
        </div>
        {isSurvivor ? (
          <Badge className="h-5 shrink-0 px-2 py-0.5 text-[10px]">Keeping</Badge>
        ) : (
          <Badge
            variant="outline"
            className="h-5 shrink-0 px-2 py-0.5 text-[10px] text-muted-foreground"
          >
            Merging away
          </Badge>
        )}
      </div>

      <dl className="mt-3 flex flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <dt className="w-14 shrink-0 text-[11px] text-muted-foreground">Email</dt>
          <dd className="min-w-0 flex-1 text-[11px]">
            {side.email ? (
              <TruncatedText text={side.email} className="text-[11px]" />
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </dd>
        </div>
        <div className="flex items-baseline gap-2">
          <dt className="w-14 shrink-0 text-[11px] text-muted-foreground">Phone</dt>
          <dd className="min-w-0 flex-1 font-mono text-[11px] tabular-nums">
            {side.phone ?? <span className="font-sans text-muted-foreground">—</span>}
          </dd>
        </div>
      </dl>
    </button>
  );
}
