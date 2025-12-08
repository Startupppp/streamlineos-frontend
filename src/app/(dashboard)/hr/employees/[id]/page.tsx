import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getDepartments } from "@/app/actions/hr";
import { EmployeeProfileForm } from "@/components/hr/employee-profile-form";

export default async function EmployeeProfilePage({ params }: { params: { id: string } }) {
  const { orgId } = await auth();
  if (!orgId) redirect("/org-selection");

  const { id } = await params;

  const client = await clerkClient();
  let clerkUser;
  try {
      clerkUser = await client.users.getUser(id);
  } catch (e) {
      return <div>User not found</div>;
  }

  const dbUser = await db.query.users.findFirst({
      where: eq(users.id, id)
  });
  
  const allDepartments = await getDepartments();

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-6">
        <Avatar className="h-24 w-24 border-4 border-gold">
           <AvatarImage src={clerkUser.imageUrl} />
           <AvatarFallback>U</AvatarFallback>
        </Avatar>
        <div>
            <h1 className="text-3xl font-bold text-white">{clerkUser.firstName} {clerkUser.lastName}</h1>
            <p className="text-zinc-400">{clerkUser.emailAddresses[0]?.emailAddress}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-white/5 border-white/10">
            <CardHeader>
                <CardTitle className="text-white">Professional Details</CardTitle>
            </CardHeader>
            <CardContent>
                <EmployeeProfileForm 
                    userId={id}
                    initialData={{
                        designation: dbUser?.designation,
                        departmentId: dbUser?.departmentId,
                        phone: dbUser?.phone
                    }}
                    departments={allDepartments}
                />
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
