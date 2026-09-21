"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export function useKeyboardShortcuts(
  onCreateProject: () => void,
  onCreateIssue: () => void,
) {
  const router = useRouter();
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    function handleKeyDown(e: KeyboardEvent) {
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

      if (e.key === "/") {
        e.stopPropagation();
        e.preventDefault();
        const searchEl = document.querySelector<HTMLElement>("[data-search-input]");
        searchEl?.focus();
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
        router.push("/build/my-work");
        return;
      }

      if (pendingKey === "g" && e.key === "p") {
        setPendingKey(null);
        router.push("/build");
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
  }, [pendingKey, onCreateProject, onCreateIssue, router]);
}
