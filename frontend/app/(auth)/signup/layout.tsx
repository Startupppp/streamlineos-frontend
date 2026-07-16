import type { Metadata } from "next";
import { BRAND_NAME } from "@/lib/branding";

export const metadata: Metadata = {
  title: `Create your ${BRAND_NAME} account`,
  description: `Start your free ${BRAND_NAME} workspace — unified HR, projects, CRM, and payroll for modern teams.`,
  alternates: { canonical: "/signup" },
  robots: { index: false, follow: false },
};

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
