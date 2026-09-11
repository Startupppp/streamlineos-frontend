import type { KeyboardEvent, MouseEvent } from "react";

/**
 * A click handler on a `div` or a `span` is invisible to a keyboard. These
 * props make such an element behave exactly like a button — focusable, in the
 * tab order, announced as a button, and activated by Enter or Space — so the
 * rule lives once instead of being retyped at every clickable row and card.
 */

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

/**
 * An element nested inside a clickable one that must swallow the interaction
 * rather than perform one — a checkbox cell, a row-action group, an inline
 * editor. Without the keyboard half, Enter or Space inside it also fires the
 * ancestor's activation.
 */
function stopPropagation(event: MouseEvent | KeyboardEvent): void {
  event.stopPropagation();
}

export const propagationShield = {
  onClick: stopPropagation,
  onKeyDown: stopPropagation,
} as const;

/**
 * The card pattern: a card that holds its own controls must not itself be a
 * button — nesting focusable content inside one is `nested-interactive`. The
 * card's primary control carries this instead, so a mouse click anywhere on the
 * card still activates it while the keyboard gets one real, labelled target.
 * The card needs `relative`, and any sibling control group needs `relative z-10`.
 */
export const CARD_ACTIVATOR_CLASS =
  "text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1";
