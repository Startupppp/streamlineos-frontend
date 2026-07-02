import { Metadata } from "next";
import { Suspense } from "react";
import { UserDetailPage } from "@/features/users/user-detail-page";

export const metadata: Metadata = {
  title: "User Detail | StreamlineOS",
};

export default async function Page({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return (
    <Suspense>
      <UserDetailPage userId={userId} />
    </Suspense>
  );
}
