import type { ReactNode } from "react";

type PublicMainProps = {
  children: ReactNode;
  className?: string;
};

/**
 * A public page's body, under the fixed nav (the top padding keeps its slot).
 * No entrance fade: a JS-driven one is server-rendered at opacity 0, so the
 * page stayed blank until hydration (and for crawlers). `relative` lifts it
 * over the shell's backdrop.
 */
export function PublicMain({ children, className }: PublicMainProps) {
  return (
    <main className={`relative flex-1 pt-28 pb-16 lg:pt-32 lg:pb-24 ${className ?? ""}`}>
      {children}
    </main>
  );
}
