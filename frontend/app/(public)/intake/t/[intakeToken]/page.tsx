"use client";

import { useParams } from "next/navigation";
import { PublicIntakeTokenView } from "@/features/build/intake/public-intake-token-view";

export default function PublicIntakeTokenPage() {
  const params = useParams<{ intakeToken: string }>();
  const intakeToken = params.intakeToken ?? "";
  return <PublicIntakeTokenView intakeToken={intakeToken} />;
}
