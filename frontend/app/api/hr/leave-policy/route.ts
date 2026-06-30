import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/helpers";

export interface LeavePolicyResponse {
  wfhMonthlyQuota: number;
  leaveTypes: Array<{
    name: string;
    daysPerYear: number;
    carryForward: boolean;
    expiresMonthly: boolean;
  }>;
}

const POLICY: LeavePolicyResponse = {
  wfhMonthlyQuota: 4,
  leaveTypes: [
    { name: "Casual Leave", daysPerYear: 12, carryForward: false, expiresMonthly: true },
    { name: "Sick Leave", daysPerYear: 6, carryForward: false, expiresMonthly: false },
    { name: "Unpaid Leave", daysPerYear: 0, carryForward: false, expiresMonthly: false },
  ],
};

export async function GET(): Promise<NextResponse> {
  return withAuth(async () => NextResponse.json(POLICY));
}
