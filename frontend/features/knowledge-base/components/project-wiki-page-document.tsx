"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { projectPageHref } from "@/features/knowledge-base/lib/knowledge-routes";
import PageDocument from "./page-document";

interface ProjectWikiPageDocumentProps {
  projectId: number;
  pageId: number;
}

export default function ProjectWikiPageDocument({ projectId, pageId }: ProjectWikiPageDocumentProps) {
  const router = useRouter();

  const handleNavigate = useCallback(
    (targetPageId: number) => {
      router.push(projectPageHref(projectId, targetPageId));
    },
    [router, projectId],
  );

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-4 py-2">
        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-muted-foreground" asChild>
          <Link href={`/projects/${projectId}/wiki`}>
            <ChevronLeft className="h-3.5 w-3.5" />
            Wiki
          </Link>
        </Button>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        <PageDocument pageId={pageId} onNavigateToPage={handleNavigate} />
      </div>
    </div>
  );
}
