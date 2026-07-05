"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useKbPagesTree, useMoveKbPage } from "@/hooks/api/kb";
import { KbMoveRightIcon, KbFileTextIcon, KbLoader2Icon } from "@/features/knowledge-base/lib/kb-icons";
import type { KbPageTreeNode } from "@/hooks/api/kb/pages";

function getPageDepth(nodes: KbPageTreeNode[], id: number): number {
  const parentMap = new Map(nodes.map((n) => [n.id, n.parentPageId]));
  let depth = 0;
  let current = parentMap.get(id) ?? null;
  while (current !== null && current !== undefined) {
    depth++;
    current = parentMap.get(current) ?? null;
    if (depth > 20) break;
  }
  return depth;
}

interface MovePageDialogProps {
  pageId: number;
  currentParentId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MovePageDialog({
  pageId,
  currentParentId,
  open,
  onOpenChange,
}: MovePageDialogProps) {
  const { data: nodes = [], isLoading } = useKbPagesTree();
  const movePage = useMoveKbPage();
  const [selectedParent, setSelectedParent] = useState<number | null>(currentParentId);

  const sortedNodes = [...nodes].sort((a, b) => {
    const depthA = getPageDepth(nodes, a.id);
    const depthB = getPageDepth(nodes, b.id);
    if (depthA !== depthB) return depthA - depthB;
    return a.sortOrder - b.sortOrder;
  });

  function handleConfirm() {
    movePage.mutate(
      { pageId, parentPageId: selectedParent, index: 0 },
      {
        onSuccess: () => {
          toast.success("Page moved");
          onOpenChange(false);
        },
        onError: () => toast.error("Failed to move page"),
      }
    );
  }

  function handleSelectRoot() {
    setSelectedParent(null);
  }

  function handleNodeButtonClick(e: React.MouseEvent<HTMLButtonElement>) {
    const id = e.currentTarget.dataset.nodeId;
    if (!id) return;
    setSelectedParent(Number(id));
  }

  function handleCancel() {
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KbMoveRightIcon className="h-4 w-4" />
            Move page
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-64 border border-border rounded-lg">
          <div className="p-2 space-y-0.5">
            <button
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                selectedParent === null
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "hover:bg-muted"
              }`}
              onClick={handleSelectRoot}
            >
              Workspace root
            </button>
            {isLoading ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">Loading…</div>
            ) : (
              sortedNodes
                .filter((n) => n.id !== pageId)
                .map((node) => {
                  const depth = getPageDepth(nodes, node.id);
                  return (
                    <button
                      key={node.id}
                      data-node-id={String(node.id)}
                      className={`w-full text-left py-2 pr-3 rounded-md text-sm transition-colors flex items-center gap-2 ${
                        selectedParent === node.id
                          ? "bg-blue-50 text-blue-700 font-medium"
                          : "hover:bg-muted"
                      }`}
                      style={{ paddingLeft: 12 + depth * 16 }}
                      onClick={handleNodeButtonClick}
                    >
                      <span className="shrink-0 text-base leading-none">
                        {node.icon ?? <KbFileTextIcon className="h-3.5 w-3.5" />}
                      </span>
                      <span className="truncate">{node.title || "Untitled"}</span>
                    </button>
                  );
                })
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={movePage.isPending}>
            {movePage.isPending ? <KbLoader2Icon className="h-4 w-4 animate-spin mr-2" /> : null}
            Move here
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
