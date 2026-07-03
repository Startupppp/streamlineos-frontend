"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Trash2, LayoutTemplate, PanelLeftOpen, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useKbPagesTree, useKbPagesFavorites, useCreateKbPage } from "@/hooks/api/kb";
import { useCan } from "@/hooks/api/access";
import PageTree from "./page-tree";
import QuickFindDialog from "./quick-find-dialog";
import type { KbPage } from "@/hooks/api/kb/pages";

export default function WikiShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: treeNodes = [], isLoading: treeLoading } = useKbPagesTree();
  const { data: favorites = [] } = useKbPagesFavorites();
  const createPage = useCreateKbPage();
  const canCreate = useCan("kb:pages:create");
  const [quickFindOpen, setQuickFindOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
    router.push("/knowledge-base");
  }

  const sidebarContent = (
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
          disabled
        >
          <Trash2 className="h-4 w-4" />
          <span>Trash</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden bg-background">
      <aside className="hidden md:flex flex-col w-[260px] shrink-0 border-r border-border/40 bg-card/50">
        {sidebarContent}
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
          {sidebarContent}
        </SheetContent>
      </Sheet>

      <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>

      <QuickFindDialog open={quickFindOpen} onOpenChange={handleQuickFindOpenChange} />
    </div>
  );
}
