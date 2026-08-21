import { requirePermission } from "@/lib/rbac/require-permission";

export default async function EditTemplateLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requirePermission("hr:documents:manage");
  return children;
}
