"use client";

import { useCallback } from "react";
import {
  MenuIcon,
  SearchIcon,
  UserIcon,
} from "@animateicons/react/lucide";
import { AnimatedLogo } from "@/components/brand/animated-logo";
import { useAskOs } from "@/components/assistant/ask-os-context";
import { useCommandPalette } from "@/components/command-palette";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { UserAvatarMenu } from "../header/user-avatar-menu";

interface MobileShellFabPanelProps {
  fabOpen: boolean;
  onFabOpenChange: (open: boolean) => void;
  profileOpen: boolean;
  onProfileOpenChange: (open: boolean) => void;
  onOpenMobileMenu: () => void;
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

/**
 * Everything the floating action button opens, kept out of first load.
 *
 * The button itself is one icon; the sheet behind it carries the animated logo,
 * the drawer primitive and the whole account menu, and none of it can be seen
 * until someone taps. The parent mounts this module the first time either
 * surface opens, so a cold authenticated load never downloads it.
 */
export function MobileShellFabPanel({
  fabOpen,
  onFabOpenChange,
  profileOpen,
  onProfileOpenChange,
  onOpenMobileMenu,
}: MobileShellFabPanelProps) {
  const { open: askOsOpen, toggle: toggleAskOs } = useAskOs();
  const { setPaletteOpen } = useCommandPalette();

  const handleCloseFab = useCallback(() => {
    onFabOpenChange(false);
  }, [onFabOpenChange]);

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
    onProfileOpenChange(true);
  }, [handleCloseFab, onProfileOpenChange]);

  return (
    <>
      <Drawer open={fabOpen} onOpenChange={onFabOpenChange} modal>
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
        onOpenChange={onProfileOpenChange}
        hideTrigger
      />
    </>
  );
}
