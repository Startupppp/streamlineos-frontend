"use client";

import { ExternalLink, GitBranch, GitMerge, GitCommit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTicketGitLinks, type GitRefType, type GitProvider } from "@/hooks/api/git-integration";

interface TicketGitLinksProps {
  projectId: number;
  ticketId: number;
}

function ProviderLabel({ provider }: { provider: GitProvider }) {
  const labels: Record<GitProvider, string> = {
    github: "GitHub",
    gitlab: "GitLab",
    bitbucket: "Bitbucket",
  };
  return <span className="text-[10px] text-muted-foreground font-medium">{labels[provider]}</span>;
}

function RefTypeIcon({ refType }: { refType: GitRefType }) {
  if (refType === "commit") return <GitCommit className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
  if (refType === "pull_request") return <GitMerge className="h-3.5 w-3.5 shrink-0 text-blue-500" />;
  return <GitBranch className="h-3.5 w-3.5 shrink-0 text-blue-500" />;
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const lower = status.toLowerCase();
  const variant =
    lower === "merged" ? "default" : lower === "open" ? "secondary" : "outline";
  return (
    <Badge variant={variant} className="h-4 px-1 text-[9px] capitalize shrink-0">
      {status}
    </Badge>
  );
}

export function TicketGitLinks({ projectId, ticketId }: TicketGitLinksProps) {
  const { data: links, isLoading } = useTicketGitLinks(projectId, ticketId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    );
  }

  return (
    <div>
      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide block mb-1.5">
        Development
      </span>
      {!links || links.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic">No linked commits or PRs yet</p>
      ) : (
        <div className="space-y-1.5">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-start gap-1.5 rounded-md border border-border bg-muted/20 px-2 py-1.5"
            >
              <RefTypeIcon refType={link.refType} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <ProviderLabel provider={link.provider} />
                  <StatusBadge status={link.status} />
                </div>
                {link.url ? (
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-foreground hover:text-accent truncate block leading-snug group"
                  >
                    <span className="truncate">{link.title ?? link.externalId}</span>
                    <ExternalLink className="h-2.5 w-2.5 inline ml-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </a>
                ) : (
                  <span className="text-[11px] text-foreground truncate block leading-snug">
                    {link.title ?? link.externalId}
                  </span>
                )}
                {link.author && (
                  <span className="text-[10px] text-muted-foreground">by {link.author}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
