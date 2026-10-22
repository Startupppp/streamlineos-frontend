import type { KeyboardEvent } from "react";

export function preventImplicitSubmit(event: KeyboardEvent<HTMLFormElement>, isLastStep: boolean): void {
  if (event.key !== "Enter" || isLastStep) return;
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (target.getAttribute("role") === "combobox" || target.getAttribute("aria-expanded") !== null) return;
  if (!event.currentTarget.contains(target)) return;
  event.preventDefault();
}
