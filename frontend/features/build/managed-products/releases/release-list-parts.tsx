import type { ReactNode } from "react";
import { ExternalLink, User } from "lucide-react";
import { CONTENT_PANEL_SOLID } from "@/components/ui/content-fill-panel";
import { Badge } from "@/components/ui/badge";
import type { ManagedProductRelease } from "@/hooks/api/build/managed-product-releases";
import type { StatusTone } from "@/lib/design-tokens";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import { getUserDisplayName } from "@/lib/person-display";

interface ReleaseSectionProps {
  id: string;
  title: string;
  description?: string;
  count: string;
  className?: string;
  children: ReactNode;
}

export function ReleaseSection({ id, title, description, count, className, children }: ReleaseSectionProps) {
  const headingId = `${id}-heading`;
  return (
    <section
      aria-labelledby={headingId}
      className={cn(CONTENT_PANEL_SOLID, "flex min-w-0 flex-col overflow-hidden shadow-sm", className)}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border/70 bg-muted/20 px-4 py-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id={headingId} className="text-sm font-semibold text-balance text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="text-dense text-pretty text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <span className="font-mono text-dense tabular-nums text-muted-foreground">{count}</span>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

interface ReleaseIdentityProps {
  release: ManagedProductRelease;
}

export function ReleaseIdentity({ release }: ReleaseIdentityProps) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-dense tabular-nums text-foreground">
        {release.version}
      </span>
      <span className="truncate text-sm font-semibold text-foreground" title={release.name}>
        {release.name}
      </span>
    </div>
  );
}

const QA_STATE_TONE: Record<string, StatusTone> = {
  pending: "neutral",
  in_review: "info",
  approved: "success",
  rejected: "danger",
};

const QA_STATE_LABEL: Record<string, string> = {
  pending: "Pending",
  in_review: "In review",
  approved: "Approved",
  rejected: "Rejected",
};

export function QaStateBadge({ qaState }: { qaState: string | null }) {
  if (!qaState) return null;
  const tone = statusToneClasses(QA_STATE_TONE[qaState] ?? "neutral");
  const label = QA_STATE_LABEL[qaState] ?? qaState;
  return (
    <Badge variant="outline" className={cn("h-5 py-0 text-micro", tone.surface, tone.ink, tone.rule)}>
      {label}
    </Badge>
  );
}

export function EvidenceLink({ url }: { url: string | null }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 text-dense text-primary hover:underline"
    >
      <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="truncate">Evidence</span>
    </a>
  );
}

interface OwnerUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

interface OwnerIndicatorProps {
  ownerUserId: string | null;
  ownerUser: OwnerUser | null;
}

export function OwnerIndicator({ ownerUserId, ownerUser }: OwnerIndicatorProps) {
  if (!ownerUserId) return null;
  return (
    <span className="flex items-center gap-1 text-dense text-muted-foreground">
      <User className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="truncate">{ownerUser ? getUserDisplayName(ownerUser) : "Owner assigned"}</span>
    </span>
  );
}
