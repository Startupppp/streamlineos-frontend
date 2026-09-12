import type { Metadata } from "next";
import { SignupForm } from "@/features/auth/signup-form";
import { BRAND_NAME } from "@/lib/branding";

export const metadata: Metadata = {
  title: `Sign up | ${BRAND_NAME}`,
  description: `Create a ${BRAND_NAME} CRM workspace with demo data included.`,
  alternates: { canonical: "/signup" },
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-8">
      <SignupForm />
    </main>
  );
}
