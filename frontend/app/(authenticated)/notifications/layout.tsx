import type { ReactNode } from "react";
import { NotificationsNav } from "@/features/notifications/notifications-nav";

export default function NotificationsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <NotificationsNav />
      <div className="flex flex-1 min-h-0 flex-col">{children}</div>
    </div>
  );
}
