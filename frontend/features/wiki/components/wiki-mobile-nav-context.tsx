"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { KbPanelLeftOpenIcon } from "@/features/wiki/lib/kb-icons";

interface WikiMobileNavContextValue {
  open: () => void;
}

const WikiMobileNavContext = createContext<WikiMobileNavContextValue | null>(
  null,
);

export function WikiMobileNavProvider({
  onOpen,
  children,
}: {
  onOpen: () => void;
  children: ReactNode;
}) {
  const open = useCallback(() => {
    onOpen();
  }, [onOpen]);

  const value = useMemo(() => ({ open }), [open]);

  return (
    <WikiMobileNavContext.Provider value={value}>
      {children}
    </WikiMobileNavContext.Provider>
  );
}

export function useWikiMobileNav(): WikiMobileNavContextValue | null {
  return useContext(WikiMobileNavContext);
}

export function WikiMobileNavTrigger() {
  const ctx = useWikiMobileNav();

  const handleOpen = useCallback(() => {
    ctx?.open();
  }, [ctx]);

  if (!ctx) return null;

  return (
    <AnimatedIconButton
      type="button"
      variant="ghost"
      size="icon"
      icon={KbPanelLeftOpenIcon}
      iconSize={16}
      className="h-8 w-8 shrink-0"
      aria-label="Open wiki navigation"
      onClick={handleOpen}
    />
  );
}
