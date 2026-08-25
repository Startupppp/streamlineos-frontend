"use client";

import { useCallback, useState } from "react";
import {
  EllipsisIcon,
  MenuIcon,
  SearchIcon,
  UserIcon,
} from "@animateicons/react/lucide";
import { AnimatedLogo } from "@/features/landing/components/animated-logo";
import { useAskOs } from "@/components/assistant/ask-os-context";
import { useCommandPalette } from "@/features/command-palette";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import { UserAvatarMenu } from "../header/user-avatar-menu";
import { cn } from "@/lib/utils";
import { useMobileShellFabPosition } from "./use-mobile-shell-fab-position";

interface MobileShellFabProps {
  onOpenMobileMenu: () => void;
  showAboveBottomNav: boolean;
  className?: string;
}

function FabMenuRow({
  label,
  onClick,
  icon,
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-1 flex-col items-center justify-center gap-1 rounded-lg py-3 text-foreground transition-colors hover:bg-muted"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </span>
      <span className="max-w-full truncate px-1 text-micro font-medium leading-tight">
        {label}
      </span>
    </button>
  );
}

export function MobileShellFab({
  onOpenMobileMenu,
  showAboveBottomNav,
  className,
}: MobileShellFabProps) {
  const [fabOpen, setFabOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { open: askOsOpen, toggle: toggleAskOs } = useAskOs();
  const { setPaletteOpen } = useCommandPalette();

  const handleToggleFab = useCallback(() => {
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

  const handleCloseFab = useCallback(() => {
    setFabOpen(false);
  }, []);

  const handleAskOs = useCallback(() => {
    handleCloseFab();
    toggleAskOs();
  }, [handleCloseFab, toggleAskOs]);

  const handleMenu = useCallback(() => {
    handleCloseFab();
    onOpenMobileMenu();
  }, [handleCloseFab, onOpenMobileMenu]);

  const handleSearch = useCallback(() => {
    handleCloseFab();
    setPaletteOpen(true);
  }, [handleCloseFab, setPaletteOpen]);

  const handleProfile = useCallback(() => {
    handleCloseFab();
    setProfileOpen(true);
  }, [handleCloseFab]);

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

      <Drawer open={fabOpen} onOpenChange={setFabOpen} modal>
        <DrawerContent className="z-[70] gap-0 rounded-t-xl pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <DrawerTitle className="sr-only">Quick actions</DrawerTitle>
          <div className="flex flex-row items-stretch justify-around gap-1 px-2 pb-2 pt-1">
            <FabMenuRow
              label="Search"
              onClick={handleSearch}
              icon={<SearchIcon size={18} />}
            />
            <FabMenuRow
              label={askOsOpen ? "Close Ask OS" : "Ask OS"}
              onClick={handleAskOs}
              icon={
                <AnimatedLogo size={20} gradient className="rounded-full" />
              }
            />
            <FabMenuRow
              label="Menu"
              onClick={handleMenu}
              icon={<MenuIcon size={18} />}
            />
            <FabMenuRow
              label="Profile"
              onClick={handleProfile}
              icon={<UserIcon size={18} />}
            />
          </div>
        </DrawerContent>
      </Drawer>

      <UserAvatarMenu
        open={profileOpen}
        onOpenChange={setProfileOpen}
        hideTrigger
      />
    </>
  );
}
