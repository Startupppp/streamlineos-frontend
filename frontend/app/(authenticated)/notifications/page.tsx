import { redirect } from "next/navigation";

export default function NotificationsInboxAliasRoute() {
  redirect("/inbox?view=notifications");
}
