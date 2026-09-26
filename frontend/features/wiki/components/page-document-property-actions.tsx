"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { KbImageIcon } from "@/features/wiki/lib/kb-icons";
import PageIconPicker from "./page-icon-picker";

interface PageDocumentPropertyActionsProps {
  icon: string | null;
  hasCover: boolean;
  isEditable: boolean;
  onIconChange: (icon: string | null) => void;
  onOpenCover: () => void;
}

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
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={onOpenCover}
              aria-label="Add cover"
            >
              <KbImageIcon className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Add cover
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
