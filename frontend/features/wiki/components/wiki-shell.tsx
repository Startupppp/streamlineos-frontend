"use client";

import { useGuardedCreateKbPage } from "@/features/wiki/hooks/use-guarded-create-kb-page";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useCan } from "@/hooks/api/access";
import { useShellSidebarCollapse } from "@/components/layout/shell-sidebar-collapse-context";
import PageTree from "./page-tree";
import QuickFindDialog from "./quick-find-dialog";
import WikiSidebarNav, { WikiSidebarFooter } from "./wiki-sidebar-nav";
import { WikiCollapsedSidebarChrome } from "./wiki-sidebar-chrome";
import {
  KNOWLEDGE_BASE,
  pageHref,
} from "@/lib/knowledge-routes";

export default function WikiShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createPage = useGuardedCreateKbPage((page) => router.push(pageHref(page.id)));
  const canViewAnalytics = useCan("kb:analytics:view");
  const canViewReviews = useCan("kb:reviews:view");
  const canManageContent = useCan("kb:pages:manage");
  const canManageTemplates = useCan("kb:templates:manage");
  const canImportPages = useCan("kb:pages:import");
  const canViewSpaces = useCan("kb:spaces:view");
  const [quickFindOpen, setQuickFindOpen] = useState(false);
  const createParamConsumedRef = useRef(false);
  const { isCollapsed: collapsed } = useShellSidebarCollapse();
  const [createConfirmOpen, setCreateConfirmOpen] = useState(false);

  const submitNewPage = createPage.submit;
  const handleNewPage = useCallback(() => {
    void submitNewPage({});
  }, [submitNewPage]);

  const handleCreateConfirm = useCallback(() => {
    setCreateConfirmOpen(false);
    handleNewPage();
  }, [handleNewPage]);

  const handleCreateConfirmOpenChange = useCallback((open: boolean) => {
    setCreateConfirmOpen(open);
  }, []);

  useEffect(() => {
    if (createParamConsumedRef.current) return;
    if (searchParams.get("create") !== "1") return;
    createParamConsumedRef.current = true;
    const next = new URLSearchParams(searchParams.toString());
    next.delete("create");
    router.replace(`${KNOWLEDGE_BASE}${next.size > 0 ? `?${next.toString()}` : ""}`);
    setCreateConfirmOpen(true);
  }, [searchParams, router]);

  const handleOpenQuickFind = useCallback(() => {
    setQuickFindOpen(true);
  }, []);

  const handleQuickFindOpenChange = useCallback((open: boolean) => {
    setQuickFindOpen(open);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        if (document.activeElement?.getAttribute("contenteditable") === "true") return;
        e.preventDefault();
        setQuickFindOpen(true);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navProps = {
    canViewAnalytics,
    canViewReviews,
    canManageContent,
    canManageTemplates,
    canImportPages,
    canViewSpaces,
  };

  const sidebarInner = () => {
    const isCollapsedView = collapsed;

    return (
      <>
        <ScrollArea className="flex-1 min-h-0 min-w-0">
          <div className={isCollapsedView ? "min-w-0 overflow-hidden pb-2" : "min-w-0 overflow-hidden px-0 pb-2"}>
            <WikiSidebarNav isCollapsed={isCollapsedView} {...navProps} />
            {!isCollapsedView && (
              <div className="min-w-0 overflow-hidden pr-2 pl-0">
                <PageTree onCloseMobile={undefined} />
              </div>
            )}
          </div>
        </ScrollArea>
        <div className={isCollapsedView ? "shrink-0" : "shrink-0 border-t border-border/40"}>
          {isCollapsedView && <Separator className="mx-auto my-1 w-6" />}
          <WikiSidebarFooter isCollapsed={isCollapsedView} onQuickFind={handleOpenQuickFind} />
        </div>
      </>
    );
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex min-h-0 flex-1 overflow-hidden bg-background">
        <aside
          className={`relative hidden md:flex flex-col shrink-0 border-r border-border bg-card/50 overflow-hidden transition-[width] duration-300 ease-in-out ${
            collapsed ? "w-10" : "w-[260px]"
          }`}
        >
          <div className="flex h-full min-w-0 flex-col overflow-hidden">
            {collapsed ? (
              <WikiCollapsedSidebarChrome
                createPending={createPage.isSubmitting}
                onNewPage={handleNewPage}
              />
            ) : null}
            {sidebarInner()}
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <ScrollArea fill hideScrollbar className="min-h-0 flex-1" viewportClassName="scroll-pt-28">
            <div className="flex h-full min-h-full flex-1 flex-col overscroll-contain">
              {children}
            </div>
          </ScrollArea>
        </div>

        <QuickFindDialog open={quickFindOpen} onOpenChange={handleQuickFindOpenChange} />
        <ConfirmDialog
          open={createConfirmOpen}
          onOpenChange={handleCreateConfirmOpenChange}
          title="Create a new document?"
          description="A new blank document will be created and opened."
          confirmLabel="Create"
          onConfirm={handleCreateConfirm}
        />
      </div>
    </TooltipProvider>
  );
}
