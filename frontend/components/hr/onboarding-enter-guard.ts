import type { KeyboardEvent } from "react";

/**
 * Before the last step, Enter in a plain text field must not submit the wizard
 * (implicit form submission). Every other Enter is left alone: a button or a
 * combobox trigger activates on Enter, and a picker's search input — portalled
 * outside the form's DOM but still bubbling through React — selects an option.
 * Blocking every Enter made the manager pickers unusable from the keyboard.
 */
export function preventImplicitSubmit(event: KeyboardEvent<HTMLFormElement>, isLastStep: boolean): void {
  if (event.key !== "Enter" || isLastStep) return;
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (target.getAttribute("role") === "combobox" || target.getAttribute("aria-expanded") !== null) return;
  if (!event.currentTarget.contains(target)) return;
  event.preventDefault();
}
