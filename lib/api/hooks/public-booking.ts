"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface InterviewBookingData {
  candidateName: string;
  orgName: string;
  interviewType: string;
  durationMinutes: number;
  availableSlots: { start: string; end: string }[];
  notes: string | null;
}

export class InterviewBookingExpiredError extends Error {
  constructor() {
    super("This booking link has expired or has already been used.");
    this.name = "InterviewBookingExpiredError";
  }
}

export function usePublicInterviewBooking(token: string) {
  return useQuery<InterviewBookingData, Error>({
    queryKey: queryKeys.publicBooking.detail(token),
    queryFn: async () => {
      try {
        return await apiClient.get<InterviewBookingData>(`/public/interview-booking/${token}`);
      } catch (e) {
        if (axios.isAxiosError(e) && e.response?.status === 410) {
          throw new InterviewBookingExpiredError();
        }
        throw e;
      }
    },
    enabled: Boolean(token),
    retry: false,
    staleTime: 0,
  });
}

interface ConfirmBookingInput {
  slotStart: string;
}

interface ConfirmBookingResponse {
  success: boolean;
  interviewId: number;
}

export function useConfirmInterviewBooking(token: string) {
  return useMutation<ConfirmBookingResponse, Error, ConfirmBookingInput>({
    mutationFn: (input) =>
      apiClient.post<ConfirmBookingResponse>(`/public/interview-booking/${token}`, input),
  });
}
