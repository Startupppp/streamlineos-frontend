import { CopyIcon, Trash2Icon } from "@animateicons/react/lucide";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import type { SupportMacro } from "@/hooks/api/support/macros";
import { isMacroVisibility, VISIBILITY_LABELS } from "./macro-constants";

interface MacroCardProps {
  macro: SupportMacro;
  usageCount: number;
  onCopy: (macro: SupportMacro) => void;
  onEdit: (macro: SupportMacro) => void;
  onDelete: (macro: SupportMacro) => void;
}

export function MacroCard({
  macro,
  usageCount,
  onCopy,
  onEdit,
  onDelete,
}: MacroCardProps) {
  function handleCopy() {
    onCopy(macro);
  }

  function handleEdit() {
    onEdit(macro);
  }

  function handleDelete() {
    onDelete(macro);
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
              <p className="truncate text-sm font-medium">{macro.title}</p>
              {macro.category ? (
                <Badge variant="secondary" className="text-micro">
                  {macro.category}
                </Badge>
              ) : null}
              <Badge variant="outline" className="text-micro">
                {isMacroVisibility(macro.visibility) ? VISIBILITY_LABELS[macro.visibility] : macro.visibility}
              </Badge>
            </div>
            <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">
              {macro.body}
            </p>
            <p className="mt-1.5 text-dense text-muted-foreground">
              Used {usageCount} {usageCount === 1 ? "time" : "times"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <AnimatedIconButton
              size="icon"
              variant="ghost"
              className="w-7"
              onClick={handleCopy}
              aria-label="Copy response"
              icon={CopyIcon}
            />
            <Button
              size="icon"
              variant="ghost"
              className="w-7"
              onClick={handleEdit}
              aria-label="Edit response"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <AnimatedIconButton
              size="icon"
              variant="ghost"
              className="w-7 text-destructive hover:text-destructive"
              onClick={handleDelete}
              aria-label="Delete response"
              icon={Trash2Icon}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
