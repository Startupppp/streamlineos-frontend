import { Metadata } from "next";
import { UsersPage } from "@/features/users/users-page";

export const metadata: Metadata = {
  title: "Users | StreamlineOS",
};

export default function Page() {
  return <UsersPage />;
}
