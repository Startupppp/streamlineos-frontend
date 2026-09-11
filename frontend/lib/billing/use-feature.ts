"use client";

import { useSession } from "next-auth/react";
import {
  canUseFeature,
  minPlanFor,
  upgradeMessageFor,
  type Feature,
  type Plan,
} from "./feature-gates";

interface UseFeatureResult {
  enabled: boolean;
  plan: Plan | null;
  requiredPlan: Plan | null;
  /** Clear copy for upgrade CTAs when the feature is locked. */
  upgradeMessage: string;
}

export function useFeature(feature: Feature): UseFeatureResult {
  const { data: session } = useSession();
  const plan = session?.plan ?? null;
  return {
    enabled: canUseFeature(plan, feature),
    plan,
    requiredPlan: minPlanFor(feature),
    upgradeMessage: upgradeMessageFor(feature),
  };
}
