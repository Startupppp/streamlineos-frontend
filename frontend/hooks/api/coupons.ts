"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";

export interface CouponRedemption {
  id: number;
  couponId: number;
  orgId: string;
  redeemedAt: string;
}

export interface Coupon {
  id: number;
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: string;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  applicablePlans: string[] | null;
  expiresAt: string | null;
  orgId: string | null;
  createdAt: string;
  updatedAt: string;
  redemptions?: CouponRedemption[];
}

interface CouponsResponse {
  coupons: Coupon[];
}

export interface CreateCouponInput {
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  maxUses?: number;
  applicablePlans?: string[];
  expiresAt?: string;
}

interface UpdateCouponInput {
  isActive?: boolean;
}

const COUPONS_QUERY_KEY = ["billing", "coupons"] as const;

export function useCoupons() {
  return useQuery<CouponsResponse, Error>({
    queryKey: COUPONS_QUERY_KEY,
    queryFn: () => apiClient.get<CouponsResponse>("/billing/coupons"),
    staleTime: 30_000,
  });
}

export function useCreateCoupon() {
  const qc = useQueryClient();
  return useMutation<Coupon, Error, CreateCouponInput>({
    mutationFn: (data) => apiClient.post<Coupon>("/billing/coupons", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: COUPONS_QUERY_KEY });
      toast.success("Coupon created");
    },
    onError: (e) => toast.error(e.message ?? "Failed to create coupon"),
  });
}

export function useUpdateCoupon() {
  const qc = useQueryClient();
  return useMutation<Coupon, Error, { id: number; data: UpdateCouponInput }>({
    mutationFn: ({ id, data }) =>
      apiClient.patch<Coupon>(`/billing/coupons/${id}`, data),
    onSuccess: (_, vars) => {
      void qc.invalidateQueries({ queryKey: COUPONS_QUERY_KEY });
      const isActive = vars.data.isActive;
      if (isActive === true) toast.success("Coupon activated");
      else if (isActive === false) toast.success("Coupon deactivated");
      else toast.success("Coupon updated");
    },
    onError: (e) => toast.error(e.message ?? "Failed to update coupon"),
  });
}
