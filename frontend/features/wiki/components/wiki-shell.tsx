"use client";

import { useGuardedCreateKbPage } from "@/features/wiki/hooks/use-guarded-create-kb-page";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useCan } from "@/hooks/api/access";
import { useShellSidebarCollapse } from "@/components/layout/shell-sidebar-collapse-context";
import PageTree from "./page-tree";
import WikiSidebarNav from "./wiki-sidebar-nav";
import { WikiCollapsedSidebarChrome } from "./wiki-sidebar-chrome";
import { WikiMobileChrome } from "./wiki-mobile-chrome";
import { KNOWLEDGE_BASE, pageHref } from "@/lib/knowledge-routes";

const QuickFindDialog = dynamic(() => import("./quick-find-dialog"), {
  ssr: false,
});

export default function WikiShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createPage = useGuardedCreateKbPage((page) =>
    router.push(pageHref(page.id)),
  );
  const canViewSpaces = useCan("kb:spaces:view");
  const [quickFindOpen, setQuickFindOpen] = useState(false);
  const [quickFindMounted, setQuickFindMounted] = useState(false);
  const createParamConsumedRef = useRef(false);
  const { isCollapsed: collapsed } = useShellSidebarCollapse();
  const [createConfirmOpen, setCreateConfirmOpen] = useState(false);
  const [createKind, setCreateKind] = useState<"document" | "spreadsheet">(
    "document",
  );

  const submitNewPage = createPage.submit;
  const handleNewPage = useCallback(
    (kind: "document" | "spreadsheet") => {
      void submitNewPage({ kind });
    },
    [submitNewPage],
  );
  const handleNewDocument = useCallback(() => {
    handleNewPage("document");
  }, [handleNewPage]);

  const handleCreateConfirm = useCallback(() => {
    setCreateConfirmOpen(false);
    handleNewPage(createKind);
  }, [handleNewPage, createKind]);

  const handleCreateConfirmOpenChange = useCallback((open: boolean) => {
    setCreateConfirmOpen(open);
  }, []);

  useEffect(() => {
    if (createParamConsumedRef.current) return;
    const createParam = searchParams.get("create");
    if (createParam !== "1" && createParam !== "spreadsheet") return;
    createParamConsumedRef.current = true;
    const next = new URLSearchParams(searchParams.toString());
    next.delete("create");
    router.replace(
      `${KNOWLEDGE_BASE}${next.size > 0 ? `?${next.toString()}` : ""}`,
    );
    setCreateKind(createParam === "spreadsheet" ? "spreadsheet" : "document");
    setCreateConfirmOpen(true);
  }, [searchParams, router]);

  function handleQuickFindOpenChange(open: boolean) {
    if (open) setQuickFindMounted(true);
    setQuickFindOpen(open);
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        if (document.activeElement?.getAttribute("contenteditable") === "true")
          return;
        e.preventDefault();
        setQuickFindMounted(true);
        setQuickFindOpen(true);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex min-h-0 flex-1 overflow-hidden bg-background">
        <aside
          className={`relative hidden h-full min-h-0 shrink-0 flex-col overflow-hidden border-r border-border bg-card/50 transition-[width] duration-300 ease-in-out lg:flex ${
            collapsed ? "w-10" : "w-[260px]"
          }`}
        >
          <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
            {collapsed ? (
              <WikiCollapsedSidebarChrome
                createPending={createPage.isSubmitting}
                onNewPage={handleNewDocument}
              />
            ) : null}
            <div
              className={
                collapsed ? "min-h-0 flex-1 overflow-y-auto" : "shrink-0"
              }
            >
              <WikiSidebarNav
                isCollapsed={collapsed}
                canViewSpaces={canViewSpaces}
              />
            </div>
            {collapsed ? null : (
              <ScrollArea
                className="min-h-0 min-w-0 flex-1"
                viewportClassName="overscroll-contain"
              >
                <div className="min-w-0 overflow-hidden pb-2 pr-2">
                  <PageTree />
                </div>
              </ScrollArea>
            )}
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <WikiMobileChrome
            canViewSpaces={canViewSpaces}
            createPending={createPage.isSubmitting}
            onNewPage={handleNewDocument}
          />
          <ScrollArea
            fill
            hideScrollbar
            className="min-h-0 flex-1"
            viewportClassName="scroll-pt-28"
          >
            <div className="flex h-full min-h-full flex-1 flex-col overscroll-contain">
              {children}
            </div>
          </ScrollArea>
        </div>

        {quickFindMounted ? (
          <QuickFindDialog
            open={quickFindOpen}
            onOpenChange={handleQuickFindOpenChange}
          />
        ) : null}
        <ConfirmDialog
          open={createConfirmOpen}
          onOpenChange={handleCreateConfirmOpenChange}
          title={
            createKind === "spreadsheet"
              ? "Create a new spreadsheet?"
              : "Create a new document?"
          }
          description={
            createKind === "spreadsheet"
              ? "A new blank spreadsheet will be created and opened."
              : "A new blank document will be created and opened."
          }
          confirmLabel="Create"
          onConfirm={handleCreateConfirm}
        />
      </div>
    </TooltipProvider>
  );
}
