import "server-only";
import { serverApiClient } from "@/lib/api/server-client";

export type CustomerSummary = {
  id: string;
  slug: string;
  name: string;
  createdAt: Date | null;
  userCount: number;
  plan: string | null;
  status: string;
  lifetimeInr: number;
};

type OrgInfo = {
  id: string;
  slug: string;
  name: string;
  createdAt: string | Date | null;
};

type OrgMember = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  joinedAt: string | Date | null;
};

type OrgPayment = {
  id: number;
  razorpayPaymentId: string | null;
  amount: number;
  currency: string | null;
  status: string | null;
  method: string | null;
  description: string | null;
  createdAt: string | Date;
};

type OrgSubscription = {
  plan: string | null;
  status: string | null;
} | null;

export async function listCustomers(): Promise<CustomerSummary[]> {
  return serverApiClient.get<CustomerSummary[]>("/platform/customers");
}

export async function getCustomerBySlug(slug: string) {
  return serverApiClient.get<{
    org: OrgInfo;
    members: OrgMember[];
    payments: OrgPayment[];
    subscription: OrgSubscription;
  }>(`/platform/customers/${slug}`);
}
