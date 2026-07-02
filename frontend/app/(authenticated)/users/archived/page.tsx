import { Metadata } from "next";
import { Suspense } from "react";
import { ArchivedUsersPage } from "@/features/users/archived-users-page";

export const metadata: Metadata = {
  title: "Archived Users | StreamlineOS",
};

export default function Page() {
  return (
    <Suspense>
      <ArchivedUsersPage />
    </Suspense>
  );
}
