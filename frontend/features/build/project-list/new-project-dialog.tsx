"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@animateicons/react/lucide";
import { ProjectCreateWizard } from "@/features/build/project-create/project-create-wizard";
import type { ProjectCreateScope } from "@/features/build/project-create/use-project-provisioning";
import { useCan } from "@/hooks/api/access";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";

interface NewProjectDialogProps {
  trigger?: ReactNode | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  scope?: ProjectCreateScope;
}

export function NewProjectDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
  scope,
}: NewProjectDialogProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const canCreate = useCan("build:create");
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

  const resolvedTrigger =
    trigger === undefined ? (
      <Button size="sm" className="gap-1.5" onClick={handleTriggerClick} {...hoverHandlers}>
        <PlusIcon ref={iconRef} size={14} />
        New Project
      </Button>
    ) : (
      trigger
    );

  return (
    <>
      {resolvedTrigger}
      <ProjectCreateWizard
        open={open}
        scope={scope}
        onOpenChange={handleOpenChange}
      />
    </>
  );
}
