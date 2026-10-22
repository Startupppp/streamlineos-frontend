import type { ReactNode } from "react";

type PublicMainProps = {
  children: ReactNode;
  className?: string;
};

export function PublicMain({ children, className }: PublicMainProps) {
  return (
    <main className={`relative flex-1 pt-28 pb-16 lg:pt-32 lg:pb-24 ${className ?? ""}`}>
      {children}
    </main>
  );
}
