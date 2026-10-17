import { requirePermission } from "@/lib/rbac/require-permission";
import { MyTimeView } from "@/features/timesheets/my-time";

type TimesheetsPageProps = {
  searchParams?: Promise<{ projectId?: string }>;
};

export default async function TimesheetsPage({ searchParams }: TimesheetsPageProps) {
  await requirePermission("timesheets:entries:view");
  const params = await searchParams;
  const rawProjectId = params?.projectId?.trim();
  const projectId = rawProjectId && /^\d+$/.test(rawProjectId) ? Number(rawProjectId) : undefined;
  return <MyTimeView projectId={projectId} />;
}
