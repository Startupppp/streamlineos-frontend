import { ReactNode } from "react";
import { Label } from "@/components/ui/label";

type Props = {
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
};

export function PublicFormField({ label, hint, required, error, children }: Props) {
  return (
    <div className="space-y-1.5">
      <Label className="text-label font-medium text-foreground flex items-center gap-1.5">
        {label}
        {required && (
          <span className="text-status-danger-ink" aria-hidden>
            *
          </span>
        )}
        {hint && (
          <span className="text-dense font-normal text-muted-foreground">({hint})</span>
        )}
      </Label>
      {children}
      {error && (
        <p role="alert" className="text-xs text-status-danger-ink">
          {error}
        </p>
      )}
    </div>
  );
}
