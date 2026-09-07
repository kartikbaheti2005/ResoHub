import { supabase } from "@/integrations/supabase/client";
import type { BookingRequest } from "@/shared/types";

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) || "http://localhost:8000";

async function getAccessToken(): Promise<string> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error("Authentication required to access ResoHub API.");
  }

  return session.access_token;
}

function normalizeBooking(raw: Record<string, unknown>): BookingRequest {
  return {
    id: String(raw.id ?? ""),
    resourceId: String(raw.resource_id ?? raw.resourceId ?? ""),
    resourceName: String(raw.resource_name ?? raw.resourceName ?? ""),
    resourceLocation: String(raw.resource_location ?? raw.resourceLocation ?? ""),
    userId: String(raw.user_id ?? raw.userId ?? ""),
    userName: String(raw.user_name ?? raw.userName ?? ""),
    userRole: (raw.user_role ?? raw.userRole ?? "STUDENT") as BookingRequest["userRole"],
    userEmail: String(raw.user_email ?? raw.userEmail ?? ""),
    userDepartment: String(raw.user_department ?? raw.userDepartment ?? ""),
    date: String(raw.date ?? ""),
    startTime: String(raw.start_time ?? raw.startTime ?? ""),
    endTime: String(raw.end_time ?? raw.endTime ?? ""),
    purpose: String(raw.purpose ?? ""),
    description: String(raw.description ?? ""),
    expectedCount: Number(raw.expected_count ?? raw.expectedCount ?? 1),
    requiredEquipment: Array.isArray(raw.required_equipment)
      ? (raw.required_equipment as string[])
      : Array.isArray(raw.requiredEquipment)
        ? (raw.requiredEquipment as string[])
        : [],
    status: (raw.status ?? "PENDING") as BookingRequest["status"],
    rejectionReason: (raw.rejection_reason ?? raw.rejectionReason ?? null) as string | null,
    requestedAt: String(raw.requested_at ?? raw.requestedAt ?? new Date().toISOString()),
    reviewedAt: (raw.reviewed_at ?? raw.reviewedAt ?? null) as string | null,
    reviewedBy: (raw.reviewed_by ?? raw.reviewedBy ?? null) as string | null,
  };
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = "Request failed";
    try {
      const payload = await response.json();
      if (typeof payload?.detail === "string") message = payload.detail;
      else if (typeof payload?.message === "string") message = payload.message;
    } catch {
      // Ignore JSON parsing failures and keep the default error
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function apiListBookings(): Promise<BookingRequest[]> {
  const rows = await apiRequest<Record<string, unknown>[]>("/api/v1/bookings");
  return (rows ?? []).map(normalizeBooking);
}

export async function apiCreateBooking(input: {
  resourceId: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  description?: string;
  expectedCount?: number;
  requiredEquipment?: string[];
}): Promise<BookingRequest> {
  const row = await apiRequest<Record<string, unknown>>("/api/v1/bookings", {
    method: "POST",
    body: JSON.stringify({
      resourceId: input.resourceId,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      purpose: input.purpose,
      description: input.description ?? "",
      expectedCount: input.expectedCount ?? 1,
      requiredEquipment: input.requiredEquipment ?? [],
    }),
  });

  return normalizeBooking(row);
}

export async function apiReviewBooking(input: {
  id: string;
  status: "APPROVED" | "REJECTED";
  reason?: string;
}): Promise<BookingRequest> {
  const row = await apiRequest<Record<string, unknown>>(`/api/v1/bookings/${input.id}/review`, {
    method: "POST",
    body: JSON.stringify({
      status: input.status,
      reason: input.reason ?? null,
    }),
  });

  return normalizeBooking(row);
}

export async function apiCancelBooking(id: string): Promise<BookingRequest> {
  const row = await apiRequest<Record<string, unknown>>(`/api/v1/bookings/${id}/cancel`, {
    method: "POST",
    body: JSON.stringify({ id }),
  });

  return normalizeBooking(row);
}
