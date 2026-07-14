"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@animateicons/react/lucide";
import { ProjectCreateWizard } from "@/features/projects/project-create/project-create-wizard";
import { useCan } from "@/hooks/api/access";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";

interface NewProjectDialogProps {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function NewProjectDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
}: NewProjectDialogProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const canCreate = useCan("projects:create");
  const { iconRef, hoverHandlers } = useAnimatedIcon();
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

  if (!canCreate && !open) {
    return null;
  }

  return (
    <>
      {trigger ?? (
        <Button size="sm" className="gap-1.5 h-8" onClick={handleTriggerClick} {...hoverHandlers}>
          <PlusIcon ref={iconRef} size={14} />
          New Project
        </Button>
      )}
      <ProjectCreateWizard open={open} onOpenChange={handleOpenChange} />
    </>
  );
}
