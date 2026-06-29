import { Metadata } from "next";
import { SuspendedUsersPage } from "@/features/users/suspended-users-page";

export const metadata: Metadata = {
  title: "Suspended Users | StreamlineOS",
};

export default function Page() {
  return <SuspendedUsersPage />;
}
