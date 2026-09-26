"use client";

import { forwardRef, useId, type ComponentPropsWithoutRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ConfirmationPhraseInputProps extends Omit<ComponentPropsWithoutRef<typeof Input>, "type"> {
  phrase: string;
}

/**
 * The typed-phrase gate for a large bulk reporting change. Use inside a
 * `FormField` with `{...field}`: the props `FormControl` injects (id,
 * aria-invalid, aria-describedby) land on the input itself, and the phrase hint
 * is appended to the description rather than replacing it.
 */
export const ConfirmationPhraseInput = forwardRef<HTMLInputElement, ConfirmationPhraseInputProps>(
  function ConfirmationPhraseInput({ phrase, className, "aria-describedby": describedBy, ...props }, ref) {
    const hintId = useId();
    return (
      <div className={cn("flex flex-col gap-1.5", className)}>
        <p id={hintId} className="text-sm text-muted-foreground">
          Type <span className="font-mono font-semibold text-foreground">{phrase}</span> to confirm.
        </p>
        <Input
          ref={ref}
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-describedby={[hintId, describedBy].filter(Boolean).join(" ")}
          {...props}
        />
      </div>
    );
  },
);
