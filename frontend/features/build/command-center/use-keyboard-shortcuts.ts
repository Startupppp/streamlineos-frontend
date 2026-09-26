"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";

export function useKeyboardShortcuts(
  onCreateProject: () => void,
  onCreateIssue: () => void,
  onShortcutHelp?: () => void,
) {
  const router = useRouter();
  const requestLeave = useNavigationLeave();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "?") {
        clearTimeout(timer);
        setPendingKey(null);
        onShortcutHelp?.();
        return;
      }

      if (e.key === "g" && !pendingKey) {
        setPendingKey("g");
        timer = setTimeout(() => setPendingKey(null), 1000);
        return;
      }

      if (e.key === "c" && !pendingKey) {
        setPendingKey("c");
        timer = setTimeout(() => setPendingKey(null), 1000);
        return;
      }

      if (pendingKey === "g" && e.key === "m") {
        setPendingKey(null);
        requestLeave(() => router.push("/build/my-work"));
        return;
      }

      if (pendingKey === "g" && e.key === "p") {
        setPendingKey(null);
        requestLeave(() => router.push("/build"));
        return;
      }

      if (pendingKey === "c" && e.key === "p") {
        setPendingKey(null);
        onCreateProject();
        return;
      }

      if (pendingKey === "c" && e.key === "t") {
        setPendingKey(null);
        onCreateIssue();
        return;
      }

      setPendingKey(null);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [pendingKey, onCreateProject, onCreateIssue, onShortcutHelp, requestLeave, router]);
}
