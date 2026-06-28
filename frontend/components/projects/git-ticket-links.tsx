"use client";

import { GitCommit, GitPullRequest, GitBranch, Github, Gitlab, ExternalLink } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyActivityIllustration } from "@/components/illustrations";
import {
  useTicketGitLinks,
  type GitProvider,
  type GitRefType,
  type TicketGitLink,
} from "@/lib/api/hooks/git-integration";

interface GitTicketLinksProps {
  ticketId: number;
  projectId: number;
}

interface ProviderIconProps {
  provider: GitProvider;
  className?: string;
}

function ProviderIcon({ provider, className }: ProviderIconProps) {
  if (provider === "github") return <Github className={className} />;
  if (provider === "gitlab") return <Gitlab className={className} />;
  return <GitBranch className={className} />;
}

interface RefIconProps {
  refType: GitRefType;
  className?: string;
}

function RefIcon({ refType, className }: RefIconProps) {
  if (refType === "pull_request") return <GitPullRequest className={className} />;
  if (refType === "branch") return <GitBranch className={className} />;
  return <GitCommit className={className} />;
}

function shortId(link: TicketGitLink): string {
  if (link.refType === "pull_request") return `#${link.externalId}`;
  return link.externalId.slice(0, 7);
}

interface LinkItemProps {
  link: TicketGitLink;
}

function LinkItem({ link }: LinkItemProps) {
  const label = link.title || shortId(link);
  const content = (
    <div className="flex items-center gap-2.5 min-w-0">
      <RefIcon refType={link.refType} className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm truncate">{label}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <ProviderIcon provider={link.provider} className="h-3 w-3 text-muted-foreground/70" />
          <span className="text-[11px] font-mono text-muted-foreground/70">{shortId(link)}</span>
          {link.author && (
            <span className="text-[11px] text-muted-foreground/70 truncate">by {link.author}</span>
          )}
          {link.status && (
            <Badge variant="secondary" className="text-[10px]">
              {link.status}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );

  if (link.url) {
    return (
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2.5 py-2 hover:bg-muted/50 transition-colors"
      >
        {content}
        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </a>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2.5 py-2">
      {content}
    </div>
  );
}

export function GitTicketLinks({ ticketId, projectId }: GitTicketLinksProps) {
  const { data: links, isLoading, isError, refetch } = useTicketGitLinks(ticketId, projectId);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Linked commits &amp; PRs</h3>
        {links && links.length > 0 && (
          <Badge variant="secondary" className="text-[10px]">
            {links.length}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState
          compact
          title="Could not load links"
          description="There was a problem loading linked commits and PRs."
          onRetry={refetch}
        />
      ) : !links || links.length === 0 ? (
        <EmptyState
          compact
          illustration={<EmptyActivityIllustration />}
          title="No linked activity"
          description="Reference this ticket's key in a commit or PR to link it."
        />
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <LinkItem key={link.id} link={link} />
          ))}
        </div>
      )}
    </div>
  );
}
