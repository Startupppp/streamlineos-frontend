"use client";

import { useSyncExternalStore } from "react";

function subscribeDocumentDark(onChange: () => void): () => void {
  const root = document.documentElement;
  const observer = new MutationObserver(onChange);
  observer.observe(root, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function readDocumentDark(): boolean {
  return document.documentElement.classList.contains("dark");
}

function readDocumentDarkServer(): boolean {
  return false;
}

export function useWhiteboardTheme(): "light" | "dark" {
  const isDark = useSyncExternalStore(
    subscribeDocumentDark,
    readDocumentDark,
    readDocumentDarkServer,
  );
  return isDark ? "dark" : "light";
}
