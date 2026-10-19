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
 * theme. The nav is fixed; PublicMain's top padding keeps its slot.
 */
export function PublicShell({ children, className }: Props) {
  return (
    <RelayRoot>
      <div className="relative flex min-h-dvh flex-col overflow-x-clip">
        <div className="relay-ui">
          <Nav {...navMock} />
        </div>
        <PublicMain className={className}>{children}</PublicMain>
        <div className="relay-ui mx-page w-page">
          <Footer {...footerMock} />
        </div>
      </div>
    </RelayRoot>
  );
}

export { PublicEyebrow } from "@/features/landing/components/public-eyebrow";
