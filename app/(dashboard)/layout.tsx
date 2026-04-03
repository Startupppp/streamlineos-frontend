import { auth } from "../../lib/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "../../components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  const role = session.user.role;
  const isAdminRole = role === "CEO" || role === "HR";
  const hasDashboardAccess = isAdminRole || session.user.hasDashboardAccess !== false;

  return (
    <DashboardShell hasDashboardAccess={hasDashboardAccess}>
      {children}
    </DashboardShell>
  );
}
