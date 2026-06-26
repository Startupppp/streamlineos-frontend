import { NextResponse } from "next/server";
import { canUseFeature, minPlanFor, type Feature, type Plan } from "./feature-gates";

export function requireFeature(plan: Plan | null | undefined, feature: Feature): NextResponse<{ error: string; requiredPlan: Plan | null }> | null {
  if (canUseFeature(plan, feature)) return null;
  return NextResponse.json(
    {
      error: `This feature requires a higher plan. Current: ${plan ?? "none"}.`,
      requiredPlan: minPlanFor(feature),
    },
    { status: 402 },
  );
}
