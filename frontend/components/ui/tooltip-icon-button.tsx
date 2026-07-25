"use client";

import * as React from "react";
import type { IconHandle } from "@animateicons/react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type AnimatedIconComponent = React.ComponentType<{
  ref?: React.Ref<IconHandle>;
  size?: number;
  className?: string;
}>;

interface TooltipIconButtonProps extends React.ComponentProps<typeof Button> {
  label: string;
  icon?: AnimatedIconComponent;
  iconSize?: number;
  side?: "top" | "right" | "bottom" | "left";
}

export const TooltipIconButton = React.forwardRef<
  HTMLButtonElement,
  TooltipIconButtonProps
>(function TooltipIconButton(
  {
    label,
    icon,
    iconSize,
    side = "top",
    size = "icon",
    variant = "ghost",
    children,
    ...props
  },
  ref,
) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {icon ? (
          <AnimatedIconButton
            ref={ref}
            icon={icon}
            iconSize={iconSize}
            size={size}
            variant={variant}
            aria-label={label}
            {...props}
          />
        ) : (
          <Button ref={ref} size={size} variant={variant} aria-label={label} {...props}>
            {children}
          </Button>
        )}
      </TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
});
