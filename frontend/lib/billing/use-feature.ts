"use client";

import { useSession } from "next-auth/react";
import { canUseFeature, minPlanFor, type Feature, type Plan } from "./feature-gates";

interface UseFeatureResult {
  enabled: boolean;
  plan: Plan | null;
  requiredPlan: Plan | null;
}

export function useFeature(feature: Feature): UseFeatureResult {
  const { data: session } = useSession();
  const plan = (session?.plan ?? null) as Plan | null;
  return {
    enabled: canUseFeature(plan, feature),
    plan,
    requiredPlan: minPlanFor(feature),
  };
}
