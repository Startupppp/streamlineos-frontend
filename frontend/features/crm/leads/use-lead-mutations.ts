"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useCreateDeal } from "@/hooks/api/crm/deals";
import {
  useAssignLead,
  useBulkDeleteLeads,
  useBulkUpdateLeads,
  useUpdateLead,
  useUpdateLeadStatus,
} from "@/hooks/api/leads";
import { getErrorMessage } from "@/lib/get-error-message";
import type { LeadPriority, PipelineStatus } from "@/types/leads";

export interface ConversionDetails {
  conversionNotes: string;
  investmentInterest: string;
  estimatedAmount: string;
  createDeal: boolean;
  dealName: string;
}

export interface BulkLeadUpdate {
  status?: PipelineStatus;
  priority?: LeadPriority;
  assignedToId?: string;
}

export interface LeadMutations {
  setStatus: (leadId: number, status: PipelineStatus) => void;
  convert: (leadId: number, details: ConversionDetails) => void;
  markLost: (leadId: number, lostReason: string) => void;
  setPriority: (leadId: number, priority: LeadPriority) => void;
  assign: (leadId: number, userId: string) => void;
  bulkUpdate: (leadIds: number[], update: BulkLeadUpdate) => void;
  /** `onDeleted` fires once the rows are gone, so a now-empty page can rewind. */
  bulkDelete: (leadIds: number[], onDeleted?: () => void) => void;
}

/**
 * Everything the lead list can do to a row.
 *
 * Gathered out of the page because a route composes and does not implement, and
 * out of the list because the list renders a description — what a status change
 * costs (a client record on conversion, an optional deal beside it) is domain
 * knowledge that belongs to neither.
 */
export function useLeadMutations(): LeadMutations {
  const updateStatus = useUpdateLeadStatus();
  const updateLead = useUpdateLead();
  const assignLead = useAssignLead();
  const bulkUpdateLeads = useBulkUpdateLeads();
  const bulkDeleteLeads = useBulkDeleteLeads();
  const createDeal = useCreateDeal();

  const setStatus = useCallback(
    (leadId: number, status: PipelineStatus) => {
      updateStatus.mutate(
        { leadId, status },
        {
          onSuccess: () => toast.success("Status updated"),
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [updateStatus],
  );

  const convert = useCallback(
    (leadId: number, details: ConversionDetails) => {
      updateStatus.mutate(
        {
          leadId,
          status: "CONVERTED",
          estimatedInvestment: details.estimatedAmount || details.investmentInterest || undefined,
          conversionNotes: details.conversionNotes,
        },
        {
          onSuccess: () => toast.success("Lead converted — client account created"),
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );

      if (!details.createDeal || !details.dealName) return;

      createDeal.mutate(
        {
          name: details.dealName,
          value: details.estimatedAmount || undefined,
          stage: "LEAD",
          notes: details.conversionNotes,
          leadId,
        },
        {
          onSuccess: () => toast.success("Deal created from converted lead"),
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [updateStatus, createDeal],
  );

  const markLost = useCallback(
    (leadId: number, lostReason: string) => {
      updateStatus.mutate(
        { leadId, status: "LOST", lostReason },
        {
          onSuccess: () => toast.success("Lead marked as lost"),
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [updateStatus],
  );

  const setPriority = useCallback(
    (leadId: number, priority: LeadPriority) => {
      updateLead.mutate(
        { id: leadId, priority },
        {
          onSuccess: () => toast.success("Priority updated"),
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [updateLead],
  );

  const assign = useCallback(
    (leadId: number, userId: string) => {
      assignLead.mutate(
        { leadId, assignedToId: userId },
        {
          onSuccess: () => toast.success("Lead assigned"),
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [assignLead],
  );

  const bulkUpdate = useCallback(
    (leadIds: number[], update: BulkLeadUpdate) => {
      bulkUpdateLeads.mutate(
        { leadIds, update },
        {
          onSuccess: (data) => toast.success(`${data.updated} leads updated`),
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [bulkUpdateLeads],
  );

  const bulkDelete = useCallback(
    (leadIds: number[], onDeleted?: () => void) => {
      bulkDeleteLeads.mutate(
        { leadIds },
        {
          onSuccess: (data) => {
            toast.success(`${data.deleted} leads deleted`);
            onDeleted?.();
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    },
    [bulkDeleteLeads],
  );

  return { setStatus, convert, markLost, setPriority, assign, bulkUpdate, bulkDelete };
}
