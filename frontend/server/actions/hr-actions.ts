"use server";

import { serverApiClient } from "@/lib/api/server-client";

type BackendEmployeeDetail = {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string | null;
  designation: string | null;
  employeeId: string | null;
  departmentId: number | null;
  image: string | null;
  isActive: boolean;
  joiningDate: string | null;
  hasDashboardAccess: boolean;
  reportingTo: string | null;
  monthlySalary: string | null;
  bio: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  githubUrl: string | null;
  websiteUrl: string | null;
  skills: string[] | null;
  phone: string | null;
};

export async function getEmployeeById(
  userId: string
): Promise<(BackendEmployeeDetail & { gender: null; experienceYears: null; taxId: null; bankDetails: null }) | null> {
  try {
    const response = await serverApiClient.get<BackendEmployeeDetail>(`/hr/employees/${userId}`);
    if (!response) return null;
    return {
      ...response,
      gender: null,
      experienceYears: null,
      taxId: null,
      bankDetails: null,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("404")) return null;
    throw error;
  }
}
