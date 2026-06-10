import { ReactNode } from "react";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
};

export function OwnerPage({
  eyebrow,
  title,
  description,
  actions,
  children,
}: Props) {
  return (
    <>
      <div className="sticky top-0 z-10 -mx-3 lg:-mx-4 px-3 lg:px-4 py-1.5 mb-1 bg-[#f6f8fc]/90 backdrop-blur-sm border-b border-slate-200/60">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[9.5px] font-mono uppercase tracking-[0.14em] text-blue-600 leading-none">
                {eyebrow}
              </p>
            )}
            <h1 className="font-display text-[0.95rem] lg:text-[1rem] font-bold tracking-[-0.01em] text-slate-900 leading-tight mt-0.5">
              {title}
            </h1>
            {description && (
              <p className="text-slate-500 text-[11px] mt-0.5 max-w-2xl leading-snug">
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
