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
import { ViewToggle } from "@/components/ui/view-toggle";

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
      <ViewToggle
        value={viewMode}
        options={[
          { value: "list", icon: List, label: "List view" },
          { value: "grid", icon: LayoutGrid, label: "Grid view" },
        ]}
        onChange={(next) => (next === "list" ? onViewList() : onViewGrid())}
      />

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
