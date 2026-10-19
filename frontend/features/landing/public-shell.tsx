import { ReactNode } from "react";
import { PublicMain } from "@/features/landing/components/public-main";
import { footerMock } from "@/features/landing/relay/data/footer";
import { navMock } from "@/features/landing/relay/data/nav";
import { Footer } from "@/features/landing/relay/home/sections/footer";
import { Nav } from "@/features/landing/relay/home/sections/nav";
import { RelayRoot } from "@/features/landing/relay/relay-root";

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * Chrome for every public marketing page: Relay's nav and footer on its dark
 * theme, over a soft brand glow and the dot field (styles/pages/public-shell.css)
 * so inner pages don't sit on flat black. The nav is fixed and shown at once
 * (no fade-in); PublicMain's top padding keeps its slot.
 */
export function PublicShell({ children, className }: Props) {
  return (
    <RelayRoot>
      <div className="relative flex min-h-dvh flex-col overflow-x-clip">
        <div aria-hidden="true" className="relay-page-backdrop" />
        <div className="relay-ui">
          <Nav {...navMock} reveal={false} />
        </div>
        <PublicMain className={className}>{children}</PublicMain>
        <div className="relay-ui relative mx-page w-page">
          <Footer {...footerMock} />
        </div>
      </div>
    </RelayRoot>
  );
}

export { PublicEyebrow } from "@/features/landing/components/public-eyebrow";
