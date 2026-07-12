"use client";

import { use } from "react";
import { AutomationBuilder } from "@/features/crm/settings/automations/builder/automation-builder";

export default function AutomationBuilderPage({
  params,
}: {
  params: Promise<{ automationId: string }>;
}) {
  const { automationId } = use(params);
  return <AutomationBuilder automationId={automationId} />;
}
