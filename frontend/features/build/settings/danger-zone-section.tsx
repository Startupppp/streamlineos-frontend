"use client";

import { useState, useCallback, useRef, memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle } from "lucide-react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { DeleteProjectDialog } from "@/features/build/sidebar/delete-project-dialog";

interface DangerZoneSectionProps {
  projectId: number;
  projectName: string;
  onDeleted: () => void;
}

export const DangerZoneSection = memo(function DangerZoneSection({
  projectId,
  projectName,
  onDeleted,
}: DangerZoneSectionProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);

  const handleDeleteClick = useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  const handleDeleteDialogOpenChange = useCallback((open: boolean) => {
    setDeleteDialogOpen(open);
    if (!open) {
      window.setTimeout(() => {
        const deleteButton = deleteButtonRef.current;
        if (deleteButton?.isConnected) deleteButton.focus();
      }, 0);
    }
  }, []);

  return (
    <Card className="border-destructive/30">
      <CardContent className="pt-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Danger Zone
        </div>
        <Separator />
        <p className="text-sm text-muted-foreground">
          Deleting a project is irreversible. It will remove all tickets,
          sprints, and associated data.
        </p>
        <AnimatedIconButton
          size="sm"
          iconSize={14}
          icon={Trash2Icon}
          ref={deleteButtonRef}
          variant="destructive"
          iconClassName="mr-1.5"
          onClick={handleDeleteClick}
        >
          Delete Project
        </AnimatedIconButton>
        <DeleteProjectDialog
          projectId={projectId}
          onDeleted={onDeleted}
          open={deleteDialogOpen}
          projectName={projectName}
          onOpenChange={handleDeleteDialogOpenChange}
        />
      </CardContent>
    </Card>
  );
});
