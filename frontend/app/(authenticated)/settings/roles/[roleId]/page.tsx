import { RoleDetailPage } from "@/features/settings/roles/role-detail-page";

export default async function Page({
  params,
}: {
  params: Promise<{ roleId: string }>;
}) {
  const { roleId } = await params;
  return <RoleDetailPage roleId={roleId} />;
}
