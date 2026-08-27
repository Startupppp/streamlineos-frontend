"use client";

import * as React from "react";
import type { IconHandle } from "@animateicons/react";
import { Button } from "@/components/ui/button";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";

type AnimatedIconComponent = React.ComponentType<{
  ref?: React.Ref<IconHandle>;
  size?: number;
  className?: string;
}>;

type BaseAnimatedIconButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "aria-label" | "children"
> & {
  icon: AnimatedIconComponent;
  iconSize?: number;
  iconClassName?: string;
};

type AnimatedIconButtonProps = BaseAnimatedIconButtonProps &
  (
    | { "aria-label": string; children?: React.ReactNode }
    | { "aria-label"?: string; children: React.ReactNode }
  );

export const AnimatedIconButton = React.forwardRef<
  HTMLButtonElement,
  AnimatedIconButtonProps
>(function AnimatedIconButton(
  {
    icon: Icon,
    iconSize = 14,
    iconClassName,
    children,
    onMouseEnter,
    onMouseLeave,
    ...props
  },
  ref,
) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();

  function handleMouseEnter(e: React.MouseEvent<HTMLButtonElement>) {
    hoverHandlers.onMouseEnter();
    onMouseEnter?.(e);
  }

  function handleMouseLeave(e: React.MouseEvent<HTMLButtonElement>) {
    hoverHandlers.onMouseLeave();
    onMouseLeave?.(e);
  }

  return (
    <Button
      ref={ref}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <Icon ref={iconRef} size={iconSize} className={iconClassName} />
      {children}
    </Button>
  );
});
