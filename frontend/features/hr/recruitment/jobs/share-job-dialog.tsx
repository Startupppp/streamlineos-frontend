"use client";

import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { CopyIcon, ExternalLinkIcon } from "@animateicons/react/lucide";
import { useJobShareLinks } from "@/hooks/api/hr/recruitment";
import { ErrorState } from "@/components/shared/error-state";
import { getErrorMessage } from "@/lib/get-error-message";
import type { JobShareLinks } from "@/hooks/api/hr/recruitment";
import { PLATFORM_ICONS } from "./job-posting-constants";

interface ShareLinkRowProps {
  link: JobShareLinks["shareLinks"][number];
  onCopy: (url: string) => void;
}

function ShareLinkRow({ link, onCopy }: ShareLinkRowProps) {
  function handleCopyUtm() {
    onCopy(link.utmUrl);
  }
  return (
    <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5 hover:bg-muted/30 transition-colors">
      <span className="w-6 text-center text-xs font-bold text-muted-foreground">{PLATFORM_ICONS[link.platform] ?? link.platform[0]}</span>
      <span className="flex-1 text-sm font-medium">{link.name}</span>
      <TooltipIconButton
        icon={CopyIcon}
        iconSize={12}
        label="Copy link"
        className="h-6 w-6"
        onClick={handleCopyUtm}
      />
      <a href={link.url} target="_blank" rel="noopener noreferrer">
        <AnimatedIconButton
          icon={ExternalLinkIcon}
          iconSize={12}
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          aria-label="Open link"
        />
      </a>
    </div>
  );
}

interface ShareJobDialogProps {
  jobId: number;
  onClose: () => void;
}

export function ShareJobDialog({ jobId, onClose }: ShareJobDialogProps) {
  const { data, isLoading, isError, error, refetch } = useJobShareLinks(jobId);

  function handleOpenChange(v: boolean) {
    if (!v) onClose();
  }

  function handleCopyLink(url: string) {
    navigator.clipboard.writeText(url).then(() => toast.success("Copied to clipboard"));
  }

  function handleCopyDirectLink() {
    if (data) handleCopyLink(data.directLink);
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Share Job Posting</DialogTitle>
          <DialogDescription className="text-xs">
            Share this job on social platforms with UTM tracking.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <ErrorState
            compact
            title="Couldn't load share links"
            description={getErrorMessage(error)}
            onRetry={() => void refetch()}
          />
        ) : data ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5 bg-muted/40">
              <span className="flex-1 text-xs text-muted-foreground truncate">{data.directLink}</span>
              <TooltipIconButton
                icon={CopyIcon}
                iconSize={12}
                label="Copy link"
                className="h-6 w-6 shrink-0"
                onClick={handleCopyDirectLink}
              />
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Share on</p>
            {data.shareLinks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No social platforms are configured for sharing. The direct link above still works.
              </p>
            ) : (
              <div className="space-y-2">
                {data.shareLinks.map((link: JobShareLinks["shareLinks"][number]) => (
                  <ShareLinkRow key={link.platform} link={link} onCopy={handleCopyLink} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            This job has no share links yet.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
