import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Live session",
  robots: { index: false, follow: false },
};

export default function RespondentLayout({ children }: { children: ReactNode }) {
  return children;
}
