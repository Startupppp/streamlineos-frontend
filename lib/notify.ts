import { toast } from "sonner";
import { getErrorMessage } from "./get-error-message";

interface NotifyPromiseMessages<T> {
  loading: string;
  success: string | ((data: T) => string);
  error?: string | ((err: unknown) => string);
}

export const notify = {
  success(msg: string): void {
    toast.success(msg);
  },
  info(msg: string): void {
    toast.info(msg);
  },
  warning(msg: string): void {
    toast.warning(msg);
  },
  error(err: unknown): void {
    toast.error(typeof err === "string" ? err : getErrorMessage(err));
  },
  promise<T>(p: Promise<T>, m: NotifyPromiseMessages<T>): Promise<T> {
    toast.promise(p, {
      loading: m.loading,
      success: m.success,
      error: m.error ?? getErrorMessage,
    });
    return p;
  },
};
