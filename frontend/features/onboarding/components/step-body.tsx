import type { ReactNode } from "react";

type StepBodyProps = {
  children: ReactNode;
  footer?: ReactNode;
};

export function StepBody({ children, footer }: StepBodyProps) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <div className="min-h-0 min-w-0 flex-1 space-y-5 overflow-y-auto overscroll-contain scrollbar-hide pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-3">
        {children}
      </div>
      {footer ? <div className="min-w-0 shrink-0">{footer}</div> : null}
    </div>
  );
}
