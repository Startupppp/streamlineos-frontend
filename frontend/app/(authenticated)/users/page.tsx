import { Metadata } from "next";
import { Suspense } from "react";
import { UsersPage } from "@/features/users/users-page";

export const metadata: Metadata = {
  title: "Users | StreamlineOS",
};

export default function Page() {
  return (
    <Suspense>
      <UsersPage />
    </Suspense>
  );
}
