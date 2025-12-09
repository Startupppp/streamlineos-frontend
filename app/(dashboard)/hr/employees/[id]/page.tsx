"use client";

import { use } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "../../../../../components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../../../components/ui/card";
import { useHrDepartments } from "../../../../../lib/hooks/trpc-hooks";
import { EmployeeProfileForm } from "../../../../../components/hr/employee-profile-form";
import { Skeleton } from "../../../../../components/ui/skeleton";

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
        <div className="flex items-center gap-6">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-48" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
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
          <h1 className="text-3xl font-bold text-white">
            {clerkUser.firstName} {clerkUser.lastName}
          </h1>
          <p className="text-zinc-400">
            {clerkUser.primaryEmailAddress?.emailAddress}
          </p>
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
                phone: null,
              }}
              departments={departments || []}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
