"use client";

import { useState, useCallback, memo } from "react";
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

  const handleDeleteClick = useCallback(() => {
    setDeleteDialogOpen(true);
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
          variant="destructive"
          size="sm"
          onClick={handleDeleteClick}
          icon={Trash2Icon}
          iconSize={14}
          iconClassName="mr-1.5"
        >
          Delete Project
        </AnimatedIconButton>
        <DeleteProjectDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          projectId={projectId}
          projectName={projectName}
          onDeleted={onDeleted}
        />
      </CardContent>
    </Card>
  );
});
