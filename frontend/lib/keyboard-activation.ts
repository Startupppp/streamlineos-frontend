import type { KeyboardEvent, MouseEvent } from "react";


export function isActivationKey(event: KeyboardEvent): boolean {
  return event.key === "Enter" || event.key === " ";
}

export interface ActivationProps {
  role: "button";
  tabIndex: number;
  onClick: () => void;
  onKeyDown: (event: KeyboardEvent) => void;
  "aria-label"?: string;
}

export function activationProps(
  activate: () => void,
  label?: string,
): ActivationProps {
  function handleClick(): void {
    activate();
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (!isActivationKey(event)) return;
    event.preventDefault();
    activate();
  }

  const props: ActivationProps = {
    role: "button",
    tabIndex: 0,
    onClick: handleClick,
    onKeyDown: handleKeyDown,
  };
  if (label !== undefined) props["aria-label"] = label;
  return props;
}

function stopPropagation(event: MouseEvent | KeyboardEvent): void {
  event.stopPropagation();
}

export const propagationShield = {
  onClick: stopPropagation,
  onKeyDown: stopPropagation,
} as const;

const INTERACTIVE_DESCENDANT_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  '[contenteditable=""]',
  '[contenteditable="true"]',
  '[role="button"]',
  '[role="checkbox"]',
  '[role="combobox"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]',
  '[role="option"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="tab"]',
  '[role="textbox"]',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function isKeyFromInteractiveDescendant(event: KeyboardEvent<HTMLElement>): boolean {
  const { target, currentTarget } = event;
  if (!(target instanceof Element) || target === currentTarget) return false;
  const interactive = target.closest(INTERACTIVE_DESCENDANT_SELECTOR);
  return interactive !== null && interactive !== currentTarget;
}

export function createRowActivationKeyHandler(activate: () => void) {
  return function handleRowActivationKey(event: KeyboardEvent<HTMLElement>) {
    if (!isActivationKey(event)) return;
    if (isKeyFromInteractiveDescendant(event)) return;
    event.preventDefault();
    activate();
  };
}

export const CARD_ACTIVATOR_CLASS =
  "text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1";
