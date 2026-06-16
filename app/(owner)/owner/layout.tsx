import { ReactNode } from "react";
import { requirePlatformOwner } from "@/lib/platform/session";
import { getOwnerLayoutData } from "@/server/queries/owner";
import { OwnerSidebar } from "@/components/owner/owner-sidebar";

export const dynamic = "force-dynamic";

export default async function OwnerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requirePlatformOwner();
  const { unreadCount, ownerName, ownerEmail } = await getOwnerLayoutData(
    session.user!.id as string,
  );

  return (
    <div className="flex min-h-screen bg-[#f6f8fc]">
      <OwnerSidebar
        ownerName={ownerName}
        ownerEmail={ownerEmail}
        unreadInbox={unreadCount}
      />
      <main className="flex-1 min-w-0">
        <div className="max-w-7xl mx-auto px-6 py-4">{children}</div>
      </main>
    </div>
  );
}
