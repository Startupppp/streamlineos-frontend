import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LandingPage } from "./_components/landing-page";

export const metadata: Metadata = {
  title: "Vaivamm Capital CRM — HR, Projects & Sales Platform",
  description:
    "Streamline HR, project management, and CRM operations with Vaivamm Capital's all-in-one enterprise platform.",
};

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  return <LandingPage />;
}
