"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Trash2, LayoutTemplate, PanelLeftOpen, PanelLeftClose, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useKbPagesTree, useKbPagesFavorites, useCreateKbPage } from "@/hooks/api/kb";
import { useCan } from "@/hooks/api/access";
import PageTree from "./page-tree";
import QuickFindDialog from "./quick-find-dialog";
import TrashDialog from "./trash-dialog";
import TemplatesDialog from "./templates-dialog";
import type { KbPage } from "@/hooks/api/kb/pages";

export default function WikiShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: treeNodes = [], isLoading: treeLoading } = useKbPagesTree();
  const { data: favorites = [] } = useKbPagesFavorites();
  const createPage = useCreateKbPage();
  const canCreate = useCan("kb:pages:create");
  const [quickFindOpen, setQuickFindOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("wiki-tree-collapsed") === "true"
  );

  const handleNewPage = useCallback(() => {
    createPage.mutate(
      {},
      {
        onSuccess: (page) => {
          router.push(`/knowledge-base/pages/${page.id}`);
        },
        onError: () => {
          toast.error("Failed to create page");
        },
      }
    );
  }, [createPage, router]);

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

  function handleTemplatesClick() {
    setTemplatesOpen(true);
  }

  function handleTrashClick() {
    setTrashOpen(true);
  }

  function handleTrashOpenChange(open: boolean) {
    setTrashOpen(open);
  }

  function handleTemplatesOpenChange(open: boolean) {
    setTemplatesOpen(open);
  }

  function handleUseTemplate(templateId: number) {
    createPage.mutate(
      { templateId },
      {
        onSuccess: (page) => {
          setTemplatesOpen(false);
          router.push(`/knowledge-base/pages/${page.id}`);
        },
        onError: () => {
          toast.error("Failed to create page from template");
        },
      }
    );
  }

  const sidebarInner = (
    <>
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-2 pb-2">
          {favorites.length > 0 && (
            <div className="mb-2">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Favorites
              </p>
              {favorites.map((page: KbPage) => (
                <a
                  key={page.id}
                  href={`/knowledge-base/pages/${page.id}`}
                  className="flex items-center gap-2 px-2 py-1 text-sm rounded-md hover:bg-muted transition-colors"
                >
                  <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                  <span className="truncate">
                    {page.icon ? `${page.icon} ` : ""}
                    {page.title || "Untitled"}
                  </span>
                </a>
              ))}
              <Separator className="my-2" />
            </div>
          )}
          <PageTree
            nodes={treeNodes}
            isLoading={treeLoading}
            onCloseMobile={handleCloseMobile}
          />
        </div>
      </ScrollArea>
      <div className="shrink-0 border-t border-border/40 p-2 space-y-0.5">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={handleOpenQuickFind}
        >
          <Search className="h-4 w-4" />
          <span>Quick find</span>
          <span className="ml-auto text-xs text-muted-foreground">⌘K</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={handleTemplatesClick}
        >
          <LayoutTemplate className="h-4 w-4" />
          <span>Templates</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          onClick={handleTrashClick}
        >
          <Trash2 className="h-4 w-4" />
          <span>Trash</span>
        </Button>
      </div>
    </>
  );

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
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </div>
      {sidebarInner}
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden bg-background">
      <aside
        className={`hidden md:flex flex-col shrink-0 border-r border-border bg-card/50 overflow-hidden transition-[width] duration-300 ease-in-out ${
          collapsed ? "w-10" : "w-[260px]"
        }`}
      >
        {collapsed ? (
          <div className="flex flex-col items-center py-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleToggleCollapsed}
              aria-label="Expand sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-3 py-2 shrink-0">
              <span className="text-sm font-semibold text-foreground">Wiki</span>
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleToggleCollapsed}
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
                {canCreate && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={handleNewPage}
                    disabled={createPage.isPending}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            {sidebarInner}
          </div>
        )}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={handleMobileOpenChange}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden fixed top-[60px] left-3 z-40 h-8 w-8 bg-background shadow-sm border border-border"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[260px] p-0 flex flex-col">
          {mobileSidebarContent}
        </SheetContent>
      </Sheet>

      <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>

      <QuickFindDialog open={quickFindOpen} onOpenChange={handleQuickFindOpenChange} />
      <TrashDialog open={trashOpen} onOpenChange={handleTrashOpenChange} />
      <TemplatesDialog
        open={templatesOpen}
        onOpenChange={handleTemplatesOpenChange}
        onUseTemplate={handleUseTemplate}
      />
    </div>
  );
}
