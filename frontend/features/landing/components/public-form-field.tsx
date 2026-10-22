import { ReactNode } from "react";

type Props = {
  label: string;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
};

export const fieldErrorId = (htmlFor: string) => `${htmlFor}-error`;

export function PublicFormField({ label, htmlFor, hint, required, error, children }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1.5 text-relay-label leading-label font-medium text-foreground"
      >
        {label}
        {required && (
          <span className="text-accent-soft" aria-hidden>
            *
          </span>
        )}
        {hint && <span className="font-normal text-foreground-muted">({hint})</span>}
      </label>
      {children}
      {error && (
        <p
          id={htmlFor ? fieldErrorId(htmlFor) : undefined}
          role="alert"
          className="pl-5 text-relay-label leading-label text-status-danger-ink"
        >
          {error}
        </p>
      )}
    </div>
  );
}
