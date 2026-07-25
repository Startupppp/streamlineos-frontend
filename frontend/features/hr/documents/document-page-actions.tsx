"use client";

import {
  FolderPlus,
  Upload,
  FilePlus2,
  Mail,
  LayoutTemplate,
  LayoutGrid,
  List,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DocumentPageActionsProps {
  viewMode: "list" | "grid";
  canManageDocs: boolean;
  onViewList: () => void;
  onViewGrid: () => void;
  onOpenLetterGen: () => void;
  onOpenNewFolder: () => void;
  onOpenUpload: () => void;
}

export function DocumentPageActions({
  viewMode,
  canManageDocs,
  onViewList,
  onViewGrid,
  onOpenLetterGen,
  onOpenNewFolder,
  onOpenUpload,
}: DocumentPageActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="rounded-lg border border-border p-1 flex items-center gap-0.5">
        <button
          type="button"
          onClick={onViewList}
          className={cn(
            "h-7 w-7 rounded-md flex items-center justify-center transition-colors duration-200",
            viewMode === "list"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-label="List view"
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onViewGrid}
          className={cn(
            "h-7 w-7 rounded-md flex items-center justify-center transition-colors duration-200",
            viewMode === "grid"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-label="Grid view"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
        </button>
      </div>

      {canManageDocs && (
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onOpenLetterGen}>
          <Mail className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Generate Letter</span>
        </Button>
      )}
      <Button variant="outline" size="sm" className="gap-1.5" asChild>
        <Link href="/hr/documents/templates">
          <LayoutTemplate className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Templates</span>
        </Link>
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={onOpenNewFolder}>
        <FolderPlus className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">New Folder</span>
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={onOpenUpload}>
        <Upload className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Upload</span>
      </Button>
      <Button size="sm" className="gap-1.5" asChild>
        <Link href="/hr/documents/editor/new">
          <FilePlus2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Create Document</span>
        </Link>
      </Button>
    </div>
  );
}
