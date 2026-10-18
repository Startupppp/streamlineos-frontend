import type { FieldValues, Path, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { getValidationFieldErrors } from "@/lib/api-envelope";
import { getErrorMessage } from "@/lib/get-error-message";

export async function submitWithFieldErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  fields: readonly Path<T>[],
  submit: () => Promise<void>,
): Promise<void> {
  try {
    await submit();
  } catch (error) {
    let shownInline = false;
    for (const issue of getValidationFieldErrors(error)) {
      const field = fields.find((name) => name === issue.path);
      if (!field) continue;
      form.setError(field, { message: issue.message });
      shownInline = true;
    }
    if (!shownInline) toast.error(getErrorMessage(error));
  }
}
