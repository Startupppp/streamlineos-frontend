import type { Metadata } from "next";
import { PortalProviders } from "@/features/portal/components/portal-providers";

export const metadata: Metadata = {
  title: {
    default: "Client Portal",
    template: "%s · Client Portal",
  },
  robots: { index: false, follow: false },
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PortalProviders>{children}</PortalProviders>;
}
