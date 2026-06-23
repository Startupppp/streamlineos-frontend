const BASE_URL = "/api";

function buildUrl(path: string, params?: Record<string, unknown>): string {
  const url = `${BASE_URL}${path}`;
  if (!params || Object.keys(params).length === 0) return url;
  const search = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => [k, String(v)]),
  ).toString();
  return search ? `${url}?${search}` : url;
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (typeof body?.error === "string") message = body.error;
    } catch {
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await fetch(buildUrl(url, params), {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  return parseResponse<T>(res);
}

async function post<T>(url: string, data?: unknown): Promise<T> {
  const res = await fetch(buildUrl(url), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
  return parseResponse<T>(res);
}

async function put<T>(url: string, data?: unknown): Promise<T> {
  const res = await fetch(buildUrl(url), {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
  return parseResponse<T>(res);
}

async function patch<T>(url: string, data?: unknown): Promise<T> {
  const res = await fetch(buildUrl(url), {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
  return parseResponse<T>(res);
}

async function del<T>(url: string, data?: unknown): Promise<T> {
  const res = await fetch(buildUrl(url), {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
  return parseResponse<T>(res);
}

async function upload<T>(url: string, formData: FormData): Promise<T> {
  const res = await fetch(buildUrl(url), {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  return parseResponse<T>(res);
}

async function download(url: string, params?: Record<string, unknown>): Promise<Blob> {
  const res = await fetch(buildUrl(url, params), {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (typeof body?.error === "string") message = body.error;
    } catch {
    }
    throw new Error(message);
  }
  return res.blob();
}

export const apiClient = { get, post, put, patch, delete: del, upload, download } as const;

export function getApiError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

export { getErrorMessage } from "./get-error-message";

export type ApiResponse<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
