import { Suspense } from "react";
import { InboxShell } from "@/features/notifications/unified-inbox";

export default function InboxPage() {
  return (
    <Suspense>
      <InboxShell />
    </Suspense>
  );
}
