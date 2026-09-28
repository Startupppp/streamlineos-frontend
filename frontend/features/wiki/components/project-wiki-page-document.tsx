"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { projectPageHref } from "@/lib/knowledge-routes";
import { ShortcutHelpDialog } from "@/features/build/shared/shortcut-help-dialog";
import PageTree from "./page-tree";
import PageDocument from "./page-document";

interface ProjectWikiPageDocumentProps {
  projectId: number;
  pageId: number;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return target.closest('[contenteditable="true"]') !== null;
}

export default function ProjectWikiPageDocument({ projectId, pageId }: ProjectWikiPageDocumentProps) {
  const router = useRouter();
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);

  const baseHref = `/build/${projectId}/wiki`;

  const handleNavigate = useCallback(
    (targetPageId: number) => {
      router.push(projectPageHref(projectId, targetPageId));
    },
    [router, projectId],
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== "?") return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      setShortcutHelpOpen(true);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <div className="flex min-h-full flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-border/60 px-4 py-2">
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-muted-foreground" asChild>
            <Link href={baseHref}>
              <ChevronLeft className="h-3.5 w-3.5" />
              Wiki
            </Link>
          </Button>
        </div>
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside
            className="hidden w-[220px] shrink-0 flex-col overflow-y-auto border-r border-border/60 px-2 py-3 md:flex"
            aria-label="Page tree"
          >
            <PageTree projectId={projectId} baseHref={baseHref} />
          </aside>
          <div className="flex min-h-0 flex-1 flex-col overflow-auto">
            <PageDocument pageId={pageId} onNavigateToPage={handleNavigate} projectId={projectId} />
          </div>
        </div>
      </div>
      <ShortcutHelpDialog open={shortcutHelpOpen} onOpenChange={setShortcutHelpOpen} />
    </>
  );
}
