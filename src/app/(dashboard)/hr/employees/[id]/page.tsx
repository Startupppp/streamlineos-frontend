"use client";

import { use } from "react";
import { useUser } from "@clerk/nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useHrDepartments } from "@/lib/hooks/trpc-hooks";
import { EmployeeProfileForm } from "@/components/hr/employee-profile-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EmployeeProfilePage({ params }: PageProps) {
  const { id } = use(params);
  const { user: clerkUser } = useUser();
  
  const { data: departments, isLoading: deptLoading } = useHrDepartments();

  if (deptLoading) {
    return (
      <div className="space-y-8">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!clerkUser) {
    return <div>User not found</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-6">
        <Avatar className="h-24 w-24 border-4 border-gold">
           <AvatarImage src={clerkUser.imageUrl} />
           <AvatarFallback>U</AvatarFallback>
        </Avatar>
        <div>
            <h1 className="text-3xl font-bold text-white">{clerkUser.firstName} {clerkUser.lastName}</h1>
            <p className="text-zinc-400">{clerkUser.primaryEmailAddress?.emailAddress}</p>
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
                        designation: null, // TODO: Get from tRPC
                        departmentId: null,
                        phone: null
                    }}
                    departments={departments || []}
                />
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
