import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Client portal | StreamlineOS",
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
