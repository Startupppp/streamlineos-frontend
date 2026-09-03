"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { cn } from "@/lib/utils";
import { useMobileShellFabPosition } from "./use-mobile-shell-fab-position";

const MobileShellFabPanel = dynamic(
  () =>
    import("./mobile-shell-fab-panel").then((m) => ({
      default: m.MobileShellFabPanel,
    })),
  { ssr: false },
);

interface MobileShellFabProps {
  onOpenMobileMenu: () => void;
  showAboveBottomNav: boolean;
  className?: string;
}

export function MobileShellFab({
  onOpenMobileMenu,
  showAboveBottomNav,
  className,
}: MobileShellFabProps) {
  const [fabOpen, setFabOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  // The sheet and the account menu live in a chunk of their own. Once either has
  // been opened the panel stays mounted, so its own open/close animation runs.
  const [panelRequested, setPanelRequested] = useState(false);

  const handleToggleFab = useCallback(() => {
    setPanelRequested(true);
    setFabOpen((open) => !open);
  }, []);

  const {
    containerRef,
    style,
    isDragging,
    isPositioned,
    pointerHandlers,
    consumeSuppressClick,
  } = useMobileShellFabPosition({
    onTap: handleToggleFab,
    bottomObstructionPx: showAboveBottomNav ? 76 : 0,
  });

  const handleFabClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (consumeSuppressClick()) {
        event.preventDefault();
        return;
      }
      handleToggleFab();
    },
    [consumeSuppressClick, handleToggleFab],
  );

  return (
    <>
      <div
        ref={containerRef}
        style={style}
        {...pointerHandlers}
        className={cn(
          "fixed z-[60] md:hidden touch-none select-none [[data-scroll-locked]_&]:hidden",
          !isPositioned && "right-4",
          !isPositioned &&
            (showAboveBottomNav
              ? "bottom-[calc(4rem+0.75rem+env(safe-area-inset-bottom))]"
              : "bottom-[calc(1rem+env(safe-area-inset-bottom))]"),
          isDragging ? "cursor-grabbing" : "cursor-grab",
          className,
        )}
      >
        <AnimatedIconButton
          icon={EllipsisIcon}
          iconSize={16}
          variant="default"
          size="icon"
          className="size-10 rounded-full shadow-lg"
          aria-label="Open quick actions"
          aria-expanded={fabOpen}
          onClick={handleFabClick}
        />
      </div>

      {panelRequested ? (
        <MobileShellFabPanel
          fabOpen={fabOpen}
          onFabOpenChange={setFabOpen}
          profileOpen={profileOpen}
          onProfileOpenChange={setProfileOpen}
          onOpenMobileMenu={onOpenMobileMenu}
        />
      ) : null}
    </>
  );
}
