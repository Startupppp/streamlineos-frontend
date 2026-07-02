import { Metadata } from "next";
import { Suspense } from "react";
import { SuspendedUsersPage } from "@/features/users/suspended-users-page";

export const metadata: Metadata = {
  title: "Suspended Users | StreamlineOS",
};

export default function Page() {
  return (
    <Suspense>
      <SuspendedUsersPage />
    </Suspense>
  );
}
