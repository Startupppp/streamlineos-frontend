"use client";

import { useCallback, useRef } from "react";
import type { IconHandle } from "@animateicons/react";

export type AnimatedNavIconComponent = React.ForwardRefExoticComponent<
  { className?: string } & React.RefAttributes<IconHandle>
>;

export function useAnimatedNavIconHover() {
  const iconRef = useRef<IconHandle>(null);

  const handleMouseEnter = useCallback(() => {
    iconRef.current?.startAnimation();
  }, []);

  const handleMouseLeave = useCallback(() => {
    iconRef.current?.stopAnimation();
  }, []);

  return {
    iconRef,
    animatedNavHoverHandlers: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    },
  };
}

export function SidebarAnimatedNavIcon({
  icon: Icon,
  iconRef,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconRef: React.RefObject<IconHandle | null>;
  className?: string;
}) {
  const IconWithRef = Icon as AnimatedNavIconComponent;
  return <IconWithRef ref={iconRef} className={className} />;
}
