"use client";

import { FolderTree, Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Trash2Icon } from "@animateicons/react/lucide";
import type { KbCategory } from "@/hooks/api/support/kb";
import { TruncatedText } from "@/components/ui/truncated-text";

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
            <TruncatedText text={category.name} className="font-medium text-sm" />
            {category.isPublished ? (
              <Badge variant="default" className="text-micro">Published</Badge>
            ) : (
              <Badge variant="secondary" className="text-micro">Hidden</Badge>
            )}
          </div>
          {category.description && (
            <TruncatedText text={category.description} className="text-xs text-muted-foreground mt-0.5" />
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            className="w-7"
            onClick={handleEdit}
            aria-label="Edit category"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AnimatedIconButton
            size="icon"
            variant="ghost"
            className="w-7 text-destructive hover:text-destructive"
            onClick={handleDelete}
            aria-label="Delete category"
            icon={Trash2Icon}
          />
        </div>
      </CardContent>
    </Card>
  );
}
