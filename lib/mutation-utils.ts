import { toast } from "sonner";
import { getErrorMessage } from "./get-error-message";

export function handleMutationError(error: unknown): void {
  toast.error(getErrorMessage(error));
}

export function handleMutationSuccess(message: string): void {
  toast.success(message);
}
