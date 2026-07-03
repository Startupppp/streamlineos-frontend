"use client";

import { createElement } from "react";
import { createRoot } from "react-dom/client";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import { SuggestionList } from "./suggestion-popup";

interface MentionItem {
  id: string | null;
  label?: string | null;
  [key: string]: unknown;
}

function positionPopup(el: HTMLElement, rect: DOMRect | null) {
  if (!rect) return;
  el.style.position = "fixed";
  el.style.zIndex = "9999";
  el.style.left = `${rect.left}px`;
  el.style.top = `${rect.bottom + 4}px`;
}

export function buildMentionRender(): () => {
  onStart: (props: SuggestionProps<MentionItem>) => void;
  onUpdate: (props: SuggestionProps<MentionItem>) => void;
  onExit: () => void;
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
} {
  return () => {
    let container: HTMLDivElement | null = null;
    let root: ReturnType<typeof createRoot> | null = null;
    let selectedIndex = 0;
    let currentProps: SuggestionProps<MentionItem> | null = null;

    function renderPopup() {
      if (!root || !currentProps) return;
      const items = currentProps.items.map((item) => ({
        id: String(item.id ?? ""),
        label: String(item.label ?? item.id ?? ""),
      }));
      root.render(
        createElement(SuggestionList, {
          items,
          selectedIndex,
          onSelect: (index: number) => {
            const raw = currentProps?.items[index];
            if (raw) currentProps?.command(raw);
          },
        })
      );
    }

    return {
      onStart(props) {
        currentProps = props;
        selectedIndex = 0;
        container = document.createElement("div");
        container.className = "tiptap-suggestion-portal";
        document.body.appendChild(container);
        root = createRoot(container);
        renderPopup();
        positionPopup(container, props.clientRect?.() ?? null);
      },
      onUpdate(props) {
        currentProps = props;
        selectedIndex = 0;
        renderPopup();
        if (container) positionPopup(container, props.clientRect?.() ?? null);
      },
      onExit() {
        root?.unmount();
        container?.remove();
        container = null;
        root = null;
        currentProps = null;
        selectedIndex = 0;
      },
      onKeyDown({ event }) {
        if (!currentProps || currentProps.items.length === 0) return false;
        const len = currentProps.items.length;
        if (event.key === "ArrowUp") {
          selectedIndex = (selectedIndex - 1 + len) % len;
          renderPopup();
          return true;
        }
        if (event.key === "ArrowDown") {
          selectedIndex = (selectedIndex + 1) % len;
          renderPopup();
          return true;
        }
        if (event.key === "Enter") {
          const item = currentProps.items[selectedIndex];
          if (item) currentProps.command(item);
          return true;
        }
        return false;
      },
    };
  };
}
