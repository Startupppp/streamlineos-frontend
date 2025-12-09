import { auth, clerkClient } from "@clerk/nextjs/server";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../../../components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card";
import { Badge } from "../../../../components/ui/badge";
import { redirect } from "next/navigation";

export default async function EmployeeDirectoryPage() {
  const { orgId } = await auth();
  if (!orgId) redirect("/org-selection");

  const client = await clerkClient();

  // Fetch users from Clerk Organization
  const memberships = await client.organizations.getOrganizationMembershipList({
    organizationId: orgId,
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">
            Employees
          </h2>
          <p className="text-zinc-400">
            Directory of all members in this organization.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {memberships.data.map((mem) => (
          <Card key={mem.id} className="bg-white/5 border-white/10">
            <CardHeader className="flex flex-row items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={mem.publicUserData?.imageUrl} />
                <AvatarFallback>
                  {mem.publicUserData?.firstName?.charAt(0)}
                  {mem.publicUserData?.lastName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-white text-lg">
                  {mem.publicUserData?.firstName} {mem.publicUserData?.lastName}
                </CardTitle>
                <div className="text-sm text-zinc-400">
                  {mem.publicUserData?.identifier}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Badge
                  variant={mem.role === "org:admin" ? "default" : "secondary"}
                >
                  {mem.role === "org:admin" ? "Admin" : "Member"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
