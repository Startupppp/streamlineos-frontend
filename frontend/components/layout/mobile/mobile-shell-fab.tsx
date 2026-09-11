"use client";

import { useCallback, useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import dynamic from "next/dynamic";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { cn } from "@/lib/utils";
import { useMobileShellFabPosition } from "./use-mobile-shell-fab-position";

const FabPanelBody = dynamic(
  () =>
    import("./mobile-shell-fab-panel").then((m) => ({
      default: m.FabPanelBody,
    })),
  { ssr: false, loading: FabDrawerSkeleton },
);

function FabDrawerSkeleton() {
  return (
    <div
      className="flex flex-row items-stretch justify-around gap-1 px-2 pb-2 pt-1"
      aria-hidden="true"
    >
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex flex-1 flex-col items-center justify-center gap-1 py-3"
        >
          <div className="size-9 rounded-lg bg-muted" />
          <div className="h-3 w-10 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

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
  const [bodyReady, setBodyReady] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fabOpen || bodyReady) return;
    const id = requestAnimationFrame(() => setBodyReady(true));
    return () => cancelAnimationFrame(id);
  }, [fabOpen, bodyReady]);

  useEffect(() => {
    if (!fabOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFabOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [fabOpen]);

  const handleClose = useCallback(() => setFabOpen(false), []);

  const handleToggleFab = useCallback(() => {
    flushSync(() => setFabOpen((open) => !open));
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
      flushSync(() => setFabOpen((open) => !open));
    },
    [consumeSuppressClick],
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

      <button
        type="button"
        aria-label="Close quick actions"
        inert={fabOpen ? undefined : true}
        onClick={handleClose}
        className={cn(
          "fixed inset-0 z-[65] bg-black/50 md:hidden",
          "transition-opacity duration-200",
          fabOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick actions"
        ref={sheetRef}
        inert={fabOpen ? undefined : true}
        className={cn(
          "fixed inset-x-0 bottom-0 z-[70] md:hidden",
          "rounded-t-xl border-t border-border bg-background",
          "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
          "transition-transform duration-200 ease-out",
          fabOpen ? "translate-y-0" : "translate-y-full",
        )}
        tabIndex={-1}
      >
        <div className="mx-auto mt-4 mb-1 h-2 w-32 rounded-full bg-muted" />
        <p className="sr-only">Quick actions</p>
        {bodyReady ? (
          <FabPanelBody
            onClose={handleClose}
            onOpenMobileMenu={onOpenMobileMenu}
          />
        ) : (
          <FabDrawerSkeleton />
        )}
      </div>
    </>
  );
}
