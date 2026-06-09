import { ReactNode } from "react";

export function OwnerPageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-8 flex items-start justify-between gap-6 flex-wrap">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-blue-600 mb-2">
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-3xl lg:text-[2rem] font-extrabold tracking-[-0.025em] text-slate-900 leading-tight">
          {title}
        </h1>
        {description && (
          <p className="text-slate-500 text-[14px] mt-1.5 max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
