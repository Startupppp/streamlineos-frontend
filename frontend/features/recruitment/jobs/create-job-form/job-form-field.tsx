import { Label } from "@/components/ui/label";
import type { CreateJobFormValues } from "./schema";

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-dense text-status-danger-ink mt-1 font-medium">{message}</p>;
}

export function Field({
  label,
  name,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  name?: keyof CreateJobFormValues;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5" data-field={name}>
      <Label className="text-xs font-semibold text-foreground/80">
        {label}
        {required && <span className="text-status-danger-ink ml-0.5">*</span>}
      </Label>
      {hint && <p className="text-micro text-muted-foreground">{hint}</p>}
      {children}
      {error && <FieldError message={error} />}
    </div>
  );
}
