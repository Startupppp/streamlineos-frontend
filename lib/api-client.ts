/**
 * Typed Axios client for all /api/v1/* route handlers.
 * Uses httpOnly session cookies — no explicit auth headers needed.
 *
 * Usage:
 *   import { apiClient } from "@/lib/api-client";
 *   const data = await apiClient.get<Lead[]>("/leads");
 *   const created = await apiClient.post<Lead>("/leads", payload);
 */

import axios, { type AxiosRequestConfig } from "axios";

const BASE_URL = "/api/v1";

const _axios = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // send httpOnly session cookie
});

// ─── Typed helpers that return T (not AxiosResponse<T>) ─────────────────────

async function get<T>(url: string, params?: Record<string, unknown>, config?: AxiosRequestConfig): Promise<T> {
  const res = await _axios.get<T>(url, { params, ...config });
  return res.data;
}

async function post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await _axios.post<T>(url, data, config);
  return res.data;
}

async function put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await _axios.put<T>(url, data, config);
  return res.data;
}

async function patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const res = await _axios.patch<T>(url, data, config);
  return res.data;
}

async function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await _axios.delete<T>(url, config);
  return res.data;
}

export const apiClient = { get, post, put, patch, delete: del } as const;

// ─── Error helper ────────────────────────────────────────────────────────────

/** Extracts a human-readable message from an Axios error. */
export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const msg = (error.response?.data as { error?: string })?.error;
    return msg ?? error.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

// ─── Shared API response type ─────────────────────────────────────────────────

/** Wrapper used by route handlers for mutation responses */
export type ApiResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
