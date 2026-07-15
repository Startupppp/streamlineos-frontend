import { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
};

export function OwnerPage({
  title,
  description,
  actions,
  children,
}: Props) {
  return (
    <>
      <div className="sticky top-0 z-10 -mx-3 lg:-mx-4 px-3 lg:px-4 py-1.5 mb-1 bg-background/90 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="font-display text-[0.95rem] lg:text-[1rem] font-bold tracking-[-0.01em] text-foreground leading-tight">
              {title}
            </h1>
            {description && (
              <p className="text-muted-foreground text-[11px] mt-0.5 max-w-2xl leading-snug">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          )}
        </div>
      </div>
      {children}
    </>
  );
}
