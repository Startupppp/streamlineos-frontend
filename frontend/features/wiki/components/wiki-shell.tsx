"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useKbPagesTree, useKbPagesFavorites, useCreateKbPage } from "@/hooks/api/kb";
import { useCan } from "@/hooks/api/access";
import { TruncatedText } from "@/components/ui/truncated-text";
import { useShellSidebarCollapse } from "@/components/layout/shell-sidebar-collapse-context";
import PageTree from "./page-tree";
import QuickFindDialog from "./quick-find-dialog";
import WikiSidebarNav, { WikiSidebarFooter } from "./wiki-sidebar-nav";
import { WikiCollapsedSidebarChrome } from "./wiki-sidebar-chrome";
import {
  KNOWLEDGE_BASE,
  pageHref,
} from "@/lib/knowledge-routes";
import { KbStarIcon } from "@/features/wiki/lib/kb-icons";

export default function WikiShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: treeNodes = [], isLoading: treeLoading } = useKbPagesTree();
  const { data: favorites = [] } = useKbPagesFavorites();
  const createPage = useCreateKbPage();
  const canViewAnalytics = useCan("kb:analytics:view");
  const canViewReviews = useCan("kb:reviews:view");
  const [quickFindOpen, setQuickFindOpen] = useState(false);
  const createParamConsumedRef = useRef(false);
  const { isCollapsed: collapsed } = useShellSidebarCollapse();

  const handleNewPage = useCallback(() => {
    createPage.mutate(
      {},
      {
        onSuccess: (page) => {
          router.push(pageHref(page.id));
        },
        onError: () => {
          toast.error("Failed to create page");
        },
      }
    );
  }, [createPage, router]);

  useEffect(() => {
    if (createParamConsumedRef.current) return;
    if (searchParams.get("create") !== "1") return;
    createParamConsumedRef.current = true;
    const next = new URLSearchParams(searchParams.toString());
    next.delete("create");
    router.replace(`${KNOWLEDGE_BASE}${next.size > 0 ? `?${next.toString()}` : ""}`);
    handleNewPage();
  }, [searchParams, router, handleNewPage]);

  const handleOpenQuickFind = useCallback(() => {
    setQuickFindOpen(true);
  }, []);

  const handleQuickFindOpenChange = useCallback((open: boolean) => {
    setQuickFindOpen(open);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
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
  };

  const sidebarInner = () => {
    const isCollapsedView = collapsed;

    return (
      <>
        <ScrollArea className="flex-1 min-h-0 min-w-0">
          <div className={isCollapsedView ? "min-w-0 overflow-hidden pb-2" : "min-w-0 overflow-hidden px-0 pb-2"}>
            <WikiSidebarNav isCollapsed={isCollapsedView} {...navProps} />
            {!isCollapsedView && favorites.length > 0 && (
              <div className="mb-2 px-2">
                <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Favorites
                </p>
                {favorites.map((page) => (
                  <Link
                    key={page.id}
                    href={pageHref(page.id)}
                    className="flex items-center gap-2 px-2 py-1 text-sm rounded-md hover:bg-muted transition-colors"
                  >
                    <KbStarIcon className="h-3 w-3 text-status-warning-ink fill-amber-500 shrink-0" />
                    <TruncatedText text={`${page.icon ? `${page.icon} ` : ""}${page.title || "Untitled"}`} />
                  </Link>
                ))}
                <Separator className="my-2" />
              </div>
            )}
            {!isCollapsedView && (
              <div className="min-w-0 overflow-hidden pr-2 pl-0">
                <PageTree
                  nodes={treeNodes}
                  isLoading={treeLoading}
                />
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
                createPending={createPage.isPending}
                onNewPage={handleNewPage}
              />
            ) : null}
            {sidebarInner()}
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <ScrollArea fill hideScrollbar className="min-h-0 flex-1" viewportClassName="scroll-pt-28">
            <div className="flex min-h-full flex-1 flex-col overscroll-contain">
              {children}
            </div>
          </ScrollArea>
        </div>

        <QuickFindDialog open={quickFindOpen} onOpenChange={handleQuickFindOpenChange} />
      </div>
    </TooltipProvider>
  );
}
