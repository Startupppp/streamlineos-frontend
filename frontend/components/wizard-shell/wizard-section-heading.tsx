import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type WizardSectionHeadingProps = {
  children: ReactNode;
  optional?: boolean;
  className?: string;
};

export function WizardSectionHeading({
  children,
  optional = false,
  className,
}: WizardSectionHeadingProps) {
  return (
    <h3
      className={cn(
        "text-sm font-semibold text-foreground",
        className,
      )}
    >
      {children}
      {optional ? (
        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
          (optional)
        </span>
      ) : null}
    </h3>
  );
}
