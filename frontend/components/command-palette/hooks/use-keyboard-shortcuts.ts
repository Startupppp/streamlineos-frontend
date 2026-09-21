"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCommandPalette } from "./use-command-palette";
import { extractBuildProjectId } from "@/lib/build/extract-build-project-id";

function isInputTarget(e: KeyboardEvent): boolean {
  const target = e.target;
  if (!(target instanceof Element)) return false;
  const tag = target.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    (target as HTMLElement).isContentEditable
  );
}

export function useKeyboardShortcuts() {
  const { setPaletteOpen, setHelpOpen, openCreateTicket } = useCommandPalette();
  const router = useRouter();
  const pathname = usePathname();
  const chordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const awaitingChordRef = useRef<string | null>(null);

  const clearChord = useCallback(() => {
    if (chordTimerRef.current !== null) {
      clearTimeout(chordTimerRef.current);
      chordTimerRef.current = null;
    }
    awaitingChordRef.current = null;
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isInputTarget(e)) {
        clearChord();
        return;
      }

      const projectId = extractBuildProjectId(pathname);

      if (awaitingChordRef.current === "g" && projectId !== null) {
        clearChord();
        if (e.key === "b") {
          e.preventDefault();
          router.push(`/build/${projectId}`);
          return;
        }
        if (e.key === "i") {
          e.preventDefault();
          router.push(`/build/${projectId}/my-tickets`);
          return;
        }
        return;
      }

      if (e.key === "?") {
        e.preventDefault();
        setHelpOpen(true);
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }

      const onBuildRoute = pathname.startsWith("/build/") || pathname === "/build";
      const onCommandCenter = pathname.startsWith("/build/command-center");

      if (e.key === "c" && onBuildRoute && !onCommandCenter) {
        e.preventDefault();
        openCreateTicket(projectId);
        return;
      }

      if (e.key === "g" && projectId !== null) {
        e.preventDefault();
        awaitingChordRef.current = "g";
        chordTimerRef.current = setTimeout(clearChord, 1000);
        return;
      }
    },
    [pathname, router, setPaletteOpen, setHelpOpen, openCreateTicket, clearChord],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearChord();
    };
  }, [handleKeyDown, clearChord]);
}
