import type { ChangeEvent } from "react";

/**
 * Some fields are stored in one case and normalise as the user types — a tax
 * registration number, a product key, a workflow secret name. The rule was
 * written as `e.target.value.toUpperCase()` inline in `onChange` at every such
 * field.
 *
 * This is deliberately NOT `codeFieldValue` from `lib/code-field.ts`. That one
 * also strips every non-alphanumeric character and truncates at a cap, which is
 * right for an IFSC or a PAN and wrong for a field that allows separators —
 * a GSTIN entered with a space, a secret name with an underscore.
 */
export function upperCaseFieldChange(
  onChange: (value: string) => void,
): (event: ChangeEvent<HTMLInputElement>) => void {
  return function handleUpperCaseFieldChange(event) {
    onChange(event.target.value.toUpperCase());
  };
}

export function lowerCaseFieldChange(
  onChange: (value: string) => void,
): (event: ChangeEvent<HTMLInputElement>) => void {
  return function handleLowerCaseFieldChange(event) {
    onChange(event.target.value.toLowerCase());
  };
}
