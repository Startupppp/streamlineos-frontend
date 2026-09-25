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
 * Page property actions live above the title (not between title and body).
 * Hidden until the title block is hovered/focused on pointer devices; always
 * visible on coarse pointers so touch users can still find them.
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
    <div className="mb-1 flex max-h-8 flex-wrap items-center gap-1 overflow-hidden opacity-100 transition-[max-height,opacity,margin] duration-150 sm:mb-0 sm:max-h-0 sm:opacity-0 sm:group-hover/title:mb-1 sm:group-hover/title:max-h-8 sm:group-hover/title:opacity-100 sm:group-focus-within/title:mb-1 sm:group-focus-within/title:max-h-8 sm:group-focus-within/title:opacity-100">
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
          className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={onOpenCover}
        >
          <KbImageIcon className="h-3.5 w-3.5" aria-hidden />
          Add cover
        </Button>
      ) : null}
    </div>
  );
}
