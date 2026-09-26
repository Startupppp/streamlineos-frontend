"use client";

import { useParams } from "next/navigation";
import { PublicFormView } from "@/features/build/forms/public-form-view";

export default function PublicFormPage() {
  const params = useParams<{ formToken: string }>();
  return <PublicFormView formToken={params.formToken} />;
}
