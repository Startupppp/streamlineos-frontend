import { ReactNode } from "react";
import { requirePlatformOwner } from "@/lib/platform/session";
import { OwnerSidebar } from "@/components/owner/owner-sidebar";

export const dynamic = "force-dynamic";

export default async function OwnerLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requirePlatformOwner();

  return (
    <div className="flex min-h-screen bg-[#f6f8fc]">
      <OwnerSidebar
        ownerName={session.user?.name ?? "Owner"}
        ownerEmail={session.user?.email ?? ""}
        unreadInbox={0}
      />
      <main className="flex-1 min-w-0">
        <div className="max-w-7xl mx-auto px-6 py-4">{children}</div>
      </main>
    </div>
  );
}
