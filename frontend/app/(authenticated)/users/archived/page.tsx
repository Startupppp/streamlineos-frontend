import { Metadata } from "next";
import { ArchivedUsersPage } from "@/features/users/archived-users-page";

export const metadata: Metadata = {
  title: "Archived Users | StreamlineOS",
};

export default function Page() {
  return <ArchivedUsersPage />;
}
