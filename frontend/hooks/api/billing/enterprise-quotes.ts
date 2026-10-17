"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import {
  billingSuccessContract,
  enterpriseQuoteCreatedContract,
  enterpriseQuoteListContract,
  type EnterpriseQuoteList,
  type EnterpriseQuoteStatus,
} from "./billing-growth-schema";

const keys = growthAndSignQueryKeys.billing;

export interface EnterpriseQuoteListParams {
  status?: EnterpriseQuoteStatus;
  cursor?: string;
  limit: number;
}

export function useEnterpriseQuotes(params: EnterpriseQuoteListParams) {
  return useGatedQuery("billing:enterprise-quotes:view", {
    queryKey: keys.enterpriseQuotes(params),
    queryFn: ({ signal }) =>
      apiClient.get<EnterpriseQuoteList>("/billing/enterprise-quotes", params, signal, enterpriseQuoteListContract),
    staleTime: 30_000,
  });
}

export interface CreateEnterpriseQuotePayload {
  subject: string;
  requestedSeats: number;
  negotiatedSeats: number;
  pricePerSeatInPaise: number;
  contractTermMonths: 12 | 24 | 36;
  validUntil: string;
  contractTerms?: string;
  notes?: string;
}

export function useCreateEnterpriseQuote() {
  const qc = useQueryClient();
  return useAuthorizedMutation("billing:enterprise-quotes:create", {
    mutationKey: ["billing", "enterprise-quotes", "create"],
    mutationFn: (payload: CreateEnterpriseQuotePayload) =>
      apiClient.post("/billing/enterprise-quotes", payload, undefined, enterpriseQuoteCreatedContract),
    // The response carries only id and ref; the row's joined names come from the server.
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.enterpriseQuotes() }),
  });
}

/** Each lifecycle step moves the quote to one known status; patch every loaded page. */
const TRANSITIONS = {
  submit: { permission: "billing:enterprise-quotes:create", next: "PENDING_APPROVAL" },
  approve: { permission: "billing:enterprise-quotes:approve", next: "APPROVED" },
  reject: { permission: "billing:enterprise-quotes:approve", next: "DRAFT" },
  send: { permission: "billing:enterprise-quotes:approve", next: "SENT" },
  accept: { permission: "billing:enterprise-quotes:view", next: "ACCEPTED" },
} as const;
export type EnterpriseQuoteAction = keyof typeof TRANSITIONS;

export interface EnterpriseQuoteActionInput {
  quoteId: number;
  notes?: string;
  reason?: string;
}

export function useEnterpriseQuoteAction(action: EnterpriseQuoteAction) {
  const qc = useQueryClient();
  const { permission, next } = TRANSITIONS[action];
  return useAuthorizedMutation(permission, {
    mutationKey: ["billing", "enterprise-quotes", action],
    mutationFn: ({ quoteId, notes, reason }: EnterpriseQuoteActionInput) => {
      const body = action === "reject" ? { reason } : action === "approve" ? (notes ? { notes } : {}) : {};
      return apiClient.post(`/billing/enterprise-quotes/${quoteId}/${action}`, body, undefined, billingSuccessContract);
    },
    onSuccess: (_, { quoteId }) => {
      qc.setQueriesData<EnterpriseQuoteList>({ queryKey: keys.enterpriseQuotes() }, (page) =>
        page ? { ...page, data: page.data.map((row) => (row.id === quoteId ? { ...row, status: next } : row)) } : page,
      );
      // An accepted quote changes negotiated seats, which the backend folds into entitlements.
      if (action === "accept") {
        void qc.invalidateQueries({ queryKey: keys.entitlements(), exact: true, refetchType: "none" });
        void qc.invalidateQueries({ queryKey: keys.seats(), exact: true, refetchType: "none" });
      }
    },
  });
}
