"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useKbPagesTree, useKbPagesFavorites, useCreateKbPage } from "@/hooks/api/kb";
import { useCan } from "@/hooks/api/access";
import { TruncatedText } from "@/components/ui/truncated-text";
import PageTree from "./page-tree";
import QuickFindDialog from "./quick-find-dialog";
import WikiSidebarNav, { WikiSidebarFooter } from "./wiki-sidebar-nav";
import {
  KNOWLEDGE_BASE,
  pageHref,
} from "@/features/knowledge-base/lib/knowledge-routes";
import type { KbPage } from "@/hooks/api/kb/pages";
import {
  KbPanelLeftCloseIcon,
  KbPanelLeftOpenIcon,
  KbPlusIcon,
  KbStarIcon,
} from "@/features/knowledge-base/lib/kb-icons";

export default function WikiShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: treeNodes = [], isLoading: treeLoading } = useKbPagesTree();
  const { data: favorites = [] } = useKbPagesFavorites();
  const createPage = useCreateKbPage();
  const canCreate = useCan("kb:pages:create");
  const canViewAnalytics = useCan("kb:analytics:view");
  const canViewReviews = useCan("kb:reviews:view");
  const canManageSettings = useCan("kb:settings:manage");
  const [quickFindOpen, setQuickFindOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const createParamConsumedRef = useRef(false);
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("wiki-tree-collapsed") === "true"
  );

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
    if (!canCreate) return;
    createParamConsumedRef.current = true;
    const next = new URLSearchParams(searchParams.toString());
    next.delete("create");
    router.replace(`${KNOWLEDGE_BASE}${next.size > 0 ? `?${next.toString()}` : ""}`);
    handleNewPage();
  }, [searchParams, router, canCreate, handleNewPage]);

  const handleOpenQuickFind = useCallback(() => {
    setQuickFindOpen(true);
  }, []);

  const handleCloseMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const handleQuickFindOpenChange = useCallback((open: boolean) => {
    setQuickFindOpen(open);
  }, []);

  const handleMobileOpenChange = useCallback((open: boolean) => {
    setMobileOpen(open);
  }, []);

  function handleToggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("wiki-tree-collapsed", String(next));
      return next;
    });
  }

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
    canManageSettings,
  };

  const sidebarInner = (forceExpanded = false) => {
    const isCollapsedView = collapsed && !forceExpanded;

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
                {favorites.map((page: KbPage) => (
                  <a
                    key={page.id}
                    href={pageHref(page.id)}
                    className="flex items-center gap-2 px-2 py-1 text-sm rounded-md hover:bg-muted transition-colors"
                  >
                    <KbStarIcon className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                    <TruncatedText text={`${page.icon ? `${page.icon} ` : ""}${page.title || "Untitled"}`} />
                  </a>
                ))}
                <Separator className="my-2" />
              </div>
            )}
            {!isCollapsedView && (
              <div className="min-w-0 overflow-hidden pr-2 pl-0">
                <PageTree
                  nodes={treeNodes}
                  isLoading={treeLoading}
                  onCloseMobile={handleCloseMobile}
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

  const mobileSidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 shrink-0">
        <span className="text-sm font-semibold text-foreground">Wiki</span>
        {canCreate && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleNewPage}
            disabled={createPage.isPending}
          >
            <KbPlusIcon className="h-4 w-4" />
          </Button>
        )}
      </div>
      {sidebarInner(true)}
    </div>
  );

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex min-h-0 flex-1 overflow-hidden bg-background">
        <aside
          className={`hidden md:flex flex-col shrink-0 border-r border-border bg-card/50 overflow-hidden transition-[width] duration-300 ease-in-out ${
            collapsed ? "w-10" : "w-[260px]"
          }`}
        >
          <div className="flex h-full min-w-0 flex-col">
            <div
              className={`flex shrink-0 items-center py-2 ${
                collapsed ? "flex-col gap-1 px-0" : "justify-between px-3"
              }`}
            >
              {collapsed ? (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={handleToggleCollapsed}
                    aria-label="Expand sidebar"
                  >
                    <KbPanelLeftOpenIcon className="size-4" />
                  </Button>
                  {canCreate && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={handleNewPage}
                      disabled={createPage.isPending}
                      aria-label="New page"
                    >
                      <KbPlusIcon className="size-4" />
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Link
                    href={KNOWLEDGE_BASE}
                    className="text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors"
                  >
                    Wiki
                  </Link>
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={handleToggleCollapsed}
                      aria-label="Collapse sidebar"
                    >
                      <KbPanelLeftCloseIcon className="size-4" />
                    </Button>
                    {canCreate && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6"
                        onClick={handleNewPage}
                        disabled={createPage.isPending}
                        aria-label="New page"
                      >
                        <KbPlusIcon className="size-4" />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
            {sidebarInner()}
          </div>
        </aside>

        <Sheet open={mobileOpen} onOpenChange={handleMobileOpenChange}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden fixed top-[60px] left-3 z-40 h-8 w-8 bg-background shadow-sm border border-border"
            >
              <KbPanelLeftOpenIcon className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[260px] p-0 flex flex-col">
            {mobileSidebarContent}
          </SheetContent>
        </Sheet>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <ScrollArea fill hideScrollbar className="min-h-0 flex-1">
            <div className="flex min-h-full flex-1 flex-col overscroll-contain">
              {children}
            </div>
          </ScrollArea>
        </main>

        <QuickFindDialog open={quickFindOpen} onOpenChange={handleQuickFindOpenChange} />
      </div>
    </TooltipProvider>
  );
}
