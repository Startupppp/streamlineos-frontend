"use client";

import { FolderTree, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { KbCategory } from "@/hooks/api/support/kb";

export interface KbCategoryListItemProps {
  category: KbCategory;
  onEdit: (category: KbCategory) => void;
  onDelete: (category: KbCategory) => void;
}

export function KbCategoryListItem({ category, onEdit, onDelete }: KbCategoryListItemProps) {
  function handleEdit() {
    onEdit(category);
  }
  function handleDelete() {
    onDelete(category);
  }
  return (
    <Card>
      <CardContent className="py-3 flex items-start gap-3">
        <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
          <FolderTree className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm truncate">{category.name}</p>
            {category.isPublished ? (
              <Badge variant="default" className="text-[10px]">Published</Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">Hidden</Badge>
            )}
          </div>
          {category.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {category.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={handleEdit}
            aria-label="Edit category"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={handleDelete}
            aria-label="Delete category"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
