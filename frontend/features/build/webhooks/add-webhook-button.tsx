"use client";

import { PlusIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { Button } from "@/components/ui/button";

interface AddWebhookButtonProps {
  onClick: () => void;
}

export function AddWebhookButton({ onClick }: AddWebhookButtonProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <Button size="sm" onClick={onClick} {...hoverHandlers}>
      <PlusIcon ref={iconRef} size={14} className="mr-1" />
      Add Webhook
    </Button>
  );
}
