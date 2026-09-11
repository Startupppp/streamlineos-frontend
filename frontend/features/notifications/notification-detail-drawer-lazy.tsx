"use client";

import dynamic from "next/dynamic";
import { NotificationDetailSkeleton } from "./notification-detail-skeleton";

export const NotificationDetailDrawerLazy = dynamic(
  () =>
    import("./notification-detail-drawer").then((m) => ({
      default: m.NotificationDetailDrawer,
    })),
  { ssr: false, loading: () => <NotificationDetailSkeleton /> },
);
