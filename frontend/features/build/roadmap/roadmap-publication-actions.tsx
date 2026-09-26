"use client";

import { useCallback } from "react";
import Link from "next/link";
import { ExternalLink, Globe, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { useCan } from "@/hooks/api/access";
import {
  usePublishRoadmap,
  useRoadmapPublication,
} from "@/hooks/api/build/roadmap";
import { getErrorMessage } from "@/lib/get-error-message";
import { writeToClipboard } from "@/lib/clipboard";

function absoluteUrl(path: string): string {
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).toString();
}

export function RoadmapPublicationActions() {
  const canManage = useCan("build:roadmap:manage");
  const { data: publication, isPending } = useRoadmapPublication();
  const publish = usePublishRoadmap();

  const path = publication?.path ?? null;

  const handleCopy = useCallback(async () => {
    if (!path) return;
    const copied = await writeToClipboard(absoluteUrl(path));
    if (copied) toast.success("Public roadmap link copied");
    else
      toast.info("Public roadmap link", {
        description: absoluteUrl(path),
        duration: 30_000,
      });
  }, [path]);

  const handlePublish = useCallback(() => {
    publish.mutate(undefined, {
      onSuccess: () => toast.success("Public roadmap published"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [publish]);

  if (isPending) return null;

  if (path) {
    return (
      <>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="min-w-0 flex-1 sm:flex-none"
        >
          <Link href={path} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            Public board
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-w-0 flex-1 sm:flex-none"
          onClick={handleCopy}
          aria-label="Copy the public roadmap link"
        >
          <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
          Copy link
        </Button>
      </>
    );
  }

  if (!canManage) return null;

  return (
    <LoadingButton
      type="button"
      variant="outline"
      size="sm"
      className="min-w-0 flex-1 gap-1.5 sm:flex-none"
      isPending={publish.isPending}
      loadingText="Publishing…"
      onClick={handlePublish}
    >
      <Globe className="h-3.5 w-3.5" aria-hidden="true" />
      Publish board
    </LoadingButton>
  );
}
