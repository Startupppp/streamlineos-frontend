import type { Metadata } from "next";
import { PublicFormView } from "@/features/build/forms/public-form-view";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ formToken: string }>;
}) {
  const { formToken } = await params;
  return <PublicFormView formToken={formToken} />;
}
