import type { KeyboardEvent } from "react";

function isConversationRow(node: EventTarget | null): node is HTMLButtonElement {
  return node instanceof HTMLButtonElement && node.dataset.conversationRow === "true";
}

function focusConversationRow(rows: HTMLButtonElement[], index: number) {
  for (let i = 0; i < rows.length; i += 1) {
    rows[i].tabIndex = i === index ? 0 : -1;
  }
  rows[index]?.focus();
}

export function handleConversationListKeyDown(
  event: KeyboardEvent<HTMLElement>,
) {
  if (event.altKey || event.metaKey || event.ctrlKey) return;
  const key = event.key;
  if (key !== "ArrowDown" && key !== "ArrowUp" && key !== "Home" && key !== "End") {
    return;
  }
  if (!isConversationRow(event.target)) return;

  const rows = [
    ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
      "[data-conversation-row='true']",
    ),
  ];
  const index = rows.indexOf(event.target);
  if (index < 0 || rows.length === 0) return;

  event.preventDefault();
  if (key === "Home") {
    focusConversationRow(rows, 0);
    return;
  }
  if (key === "End") {
    focusConversationRow(rows, rows.length - 1);
    return;
  }
  const next = key === "ArrowDown" ? index + 1 : index - 1;
  if (next < 0 || next >= rows.length) return;
  focusConversationRow(rows, next);
}
