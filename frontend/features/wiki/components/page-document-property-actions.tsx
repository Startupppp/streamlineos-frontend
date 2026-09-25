"use client";

import { Button } from "@/components/ui/button";
import { KbImageIcon } from "@/features/wiki/lib/kb-icons";
import PageIconPicker from "./page-icon-picker";

interface PageDocumentPropertyActionsProps {
  icon: string | null;
  hasCover: boolean;
  isEditable: boolean;
  onIconChange: (icon: string | null) => void;
  onOpenCover: () => void;
}

/**
 * Compact property actions sit on the same row as the title.
 */
export function PageDocumentPropertyActions({
  icon,
  hasCover,
  isEditable,
  onIconChange,
  onOpenCover,
}: PageDocumentPropertyActionsProps) {
  if (!isEditable) return null;
  if (icon && hasCover) return null;

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {!icon ? (
        <PageIconPicker
          icon={null}
          isEditable
          onIconChange={onIconChange}
          variant="action"
        />
      ) : null}
      {!hasCover ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={onOpenCover}
        >
          <KbImageIcon className="h-3.5 w-3.5" aria-hidden />
          Add cover
        </Button>
      ) : null}
    </div>
  );
}
