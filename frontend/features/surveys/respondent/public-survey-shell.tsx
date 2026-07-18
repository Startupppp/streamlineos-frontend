import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PublicSurveyShellProps = {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  compactHeader?: boolean;
  mode?: "intro" | "form" | "complete";
};

export function PublicSurveyShell({
  title,
  subtitle,
  children,
  compactHeader = false,
  mode = "intro",
}: PublicSurveyShellProps) {
  const isForm = mode === "form";

  return (
    <main
      className={cn(
        "flex min-h-dvh items-center justify-center surface-soft px-4 py-6 sm:py-10",
        isForm && "items-start sm:items-center",
      )}
    >
      <div
        className={cn(
          "w-full",
          isForm ? "max-w-xl" : "max-w-md",
        )}
      >
        <Card
          className={cn(
            "overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm",
            isForm && "sm:shadow-md",
          )}
        >
          {title && !isForm ? (
            <div
              className={cn(
                "border-b border-border/60 bg-muted/25 text-center",
                compactHeader ? "px-5 py-4" : "px-6 py-6",
              )}
            >
              <h1
                className={cn(
                  "font-semibold tracking-tight text-foreground",
                  compactHeader ? "text-base" : "text-xl",
                )}
              >
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
              ) : null}
            </div>
          ) : null}
          <div className={cn(isForm ? "px-5 py-6 sm:px-8 sm:py-8" : "px-6 py-6")}>
            {children}
          </div>
        </Card>
      </div>
    </main>
  );
}
