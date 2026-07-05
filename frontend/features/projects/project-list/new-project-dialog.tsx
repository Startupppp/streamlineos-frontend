"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ProjectCreateWizard } from "@/features/projects/project-create/project-create-wizard";

interface NewProjectDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function NewProjectDialog({ trigger, open: controlledOpen, onOpenChange }: NewProjectDialogProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  function handleOpenChange(value: boolean) {
    if (isControlled) {
      onOpenChange?.(value);
    } else {
      setInternalOpen(value);
    }
  }

  function handleTriggerClick() {
    handleOpenChange(true);
  }

  return (
    <>
      {!isControlled && (
        trigger ?? (
          <Button size="sm" className="gap-1.5" onClick={handleTriggerClick}>
            <Plus className="h-3.5 w-3.5" />
            New Project
          </Button>
        )
      )}
      <ProjectCreateWizard open={open} onOpenChange={handleOpenChange} />
    </>
  );
}
