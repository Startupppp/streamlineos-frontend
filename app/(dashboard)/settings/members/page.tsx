import { redirect } from "next/navigation";

export default function MembersSettingsPage() {
  // Clerk's OrganizationProfile includes "Members" tab by default.
  // We just redirect to the Organization page, let user navigate tabs or use hash routing to default to members if supported.
  // Actually OrganizationProfile has no simple URL prop for default tab in basic usage, but hash routing works.
  redirect("/settings/organization");
}
