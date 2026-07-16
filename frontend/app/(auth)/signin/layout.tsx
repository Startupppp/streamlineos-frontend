import type { Metadata } from "next";
import { BRAND_NAME } from "@/lib/branding";

export const metadata: Metadata = {
  title: `Sign in to ${BRAND_NAME}`,
  description: `Sign in to your ${BRAND_NAME} workspace — HR, projects, CRM, and more in one platform.`,
  alternates: { canonical: "/signin" },
  robots: { index: false, follow: false },
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
