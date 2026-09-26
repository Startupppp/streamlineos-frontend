"use client";

import { useParams } from "next/navigation";
import { PublicIntakeView } from "@/features/build/intake/public-intake-view";

export default function PublicIntakePage() {
  const params = useParams<{ projectId: string }>();
  return <PublicIntakeView projectId={params.projectId} />;
}
