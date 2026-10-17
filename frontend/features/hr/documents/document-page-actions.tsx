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
  // Measured at 1024: six labelled controls clipped "Create Document" off-screen
  // and squeezed the title to one word per line. Secondary labels show from xl;
  // below that they are icon buttons named by aria-label. The primary keeps text.
  return (
    <div className="flex items-center gap-2">
      <div className="rounded-lg border border-border p-1 flex items-center gap-0.5">
        <button
          type="button"
          onClick={onViewList}
          className={cn(
            "h-7 w-7 rounded-md flex items-center justify-center transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            viewMode === "list"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-label="List view"
          aria-pressed={viewMode === "list"}
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onViewGrid}
          className={cn(
            "h-7 w-7 rounded-md flex items-center justify-center transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            viewMode === "grid"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-label="Grid view"
          aria-pressed={viewMode === "grid"}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
        </button>
      </div>

      {canManageDocs && (
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onOpenLetterGen} aria-label="Generate Letter">
          <Mail className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">Generate Letter</span>
        </Button>
      )}
      <Button variant="outline" size="sm" className="gap-1.5" asChild>
        <Link href="/hr/documents/templates" aria-label="Templates">
          <LayoutTemplate className="h-3.5 w-3.5" />
          <span className="hidden xl:inline">Templates</span>
        </Link>
      </Button>
      {canManageDocs ? (
        <>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onOpenNewFolder} aria-label="New Folder">
            <FolderPlus className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">New Folder</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={onOpenUpload} aria-label="Upload">
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">Upload</span>
          </Button>
          <Button size="sm" className="gap-1.5" asChild>
            <Link href="/hr/documents/editor/new" aria-label="Create Document">
              <FilePlus2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Create Document</span>
            </Link>
          </Button>
        </>
      ) : null}
    </div>
  );
}
