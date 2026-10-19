import { ReactNode } from "react";

type Props = {
  label: string;
  /** The control's id — ties the label to it and the error to its aria-describedby. */
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
};

/** Error id for a field's control, to pass as its aria-describedby. */
export const fieldErrorId = (htmlFor: string) => `${htmlFor}-error`;

/**
 * Field shell for the public (Relay) forms: a quiet label above the control,
 * the inline error below it in the dark theme's danger ink.
 */
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
