import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "StreamlineOS",
    template: "%s | StreamlineOS",
  },
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
