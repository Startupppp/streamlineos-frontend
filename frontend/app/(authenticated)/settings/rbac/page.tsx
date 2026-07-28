import { redirect } from "next/navigation";

export default function RbacOverviewPage() {
  redirect("/settings/roles");
}
