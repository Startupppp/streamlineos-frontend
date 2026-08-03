import type { Metadata } from "next";
import { BRAND_NAME } from "@/lib/branding";

export const metadata: Metadata = {
  title: `Sign in or create an account | ${BRAND_NAME}`,
  description: `Sign in or create your ${BRAND_NAME} organization — HR, projects, CRM, and more in one platform.`,
  alternates: { canonical: "/signin" },
  robots: { index: false, follow: false },
};

export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
