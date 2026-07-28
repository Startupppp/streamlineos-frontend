import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/rbac/require-permission";
import { ModuleAccessPage } from "@/features/module-access/module-access-page";
import type { PermissionKey } from "@/lib/rbac/permissions";

const MODULE_META: Record<
  string,
  { label: string; permission: PermissionKey }
> = {
  hr: { label: "HR", permission: "hr:access:view" },
  crm: { label: "CRM", permission: "crm:access:view" },
  build: { label: "Build", permission: "build:access:view" },
  inventory: { label: "Inventory", permission: "inventory:access:view" },
  accounting: { label: "Accounting", permission: "accounting:access:view" },
  kb: { label: "Knowledge Base", permission: "kb:access:view" },
  chat: { label: "Chat", permission: "chat:access:view" },
  support: { label: "Support", permission: "support:access:view" },
  surveys: { label: "Surveys", permission: "surveys:access:view" },
  payroll: { label: "Payroll", permission: "payroll:access:view" },
  sign: { label: "E-Sign", permission: "sign:access:view" },
};

type Params = Promise<{ moduleKey: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { moduleKey } = await params;
  const meta = MODULE_META[moduleKey];
  return {
    title: meta ? `${meta.label} Access` : "Module Access",
  };
}

export default async function ModuleAccessRoute({
  params,
}: {
  params: Params;
}) {
  const { moduleKey } = await params;
  const meta = MODULE_META[moduleKey];
  if (!meta) notFound();

  await requirePermission(meta.permission);

  return (
    <ModuleAccessPage moduleKey={moduleKey} title={`${meta.label} Access`} />
  );
}
