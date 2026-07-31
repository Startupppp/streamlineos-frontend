"use client";

import { PlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Button } from "@/components/ui/button";

interface NewAutomationButtonProps {
  onClick: () => void;
}

export function NewAutomationButton({ onClick }: NewAutomationButtonProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button size="sm" onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} className="mr-1" />
      New Automation
    </Button>
  );
}
