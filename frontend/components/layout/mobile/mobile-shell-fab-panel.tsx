"use client";

import { useCallback, useState } from "react";
import {
  MenuIcon,
  SearchIcon,
  UserIcon,
} from "@animateicons/react/lucide";
import { AnimatedLogo } from "@/components/brand/animated-logo";
import { useAskOs } from "@/components/assistant/ask-os-context";
import { useCommandPaletteActions } from "@/components/command-palette";
import { UserAvatarMenu } from "../header/user-avatar-menu";

interface FabPanelBodyProps {
  onClose: () => void;
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
 * The content rows rendered inside the FAB drawer once it has painted.
 * Kept in its own chunk so the first tap only pays the overlay + skeleton;
 * this module (animated icons, context hooks, avatar menu) loads in the rAF
 * that fires after the drawer frame is on screen.
 */
export function FabPanelBody({ onClose, onOpenMobileMenu }: FabPanelBodyProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const { open: askOsOpen, toggle: toggleAskOs } = useAskOs();
  const { setPaletteOpen } = useCommandPaletteActions();

  const handleAskOs = useCallback(() => {
    onClose();
    toggleAskOs();
  }, [onClose, toggleAskOs]);

  const handleMenu = useCallback(() => {
    onClose();
    onOpenMobileMenu();
  }, [onClose, onOpenMobileMenu]);

  const handleSearch = useCallback(() => {
    onClose();
    setPaletteOpen(true);
  }, [onClose, setPaletteOpen]);

  const handleProfile = useCallback(() => {
    onClose();
    setProfileOpen(true);
  }, [onClose]);

  return (
    <>
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
      <UserAvatarMenu
        open={profileOpen}
        onOpenChange={setProfileOpen}
        hideTrigger
      />
    </>
  );
}
