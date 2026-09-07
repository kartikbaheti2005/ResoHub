import type {
  BookingRequest,
  MaintenanceSchedule,
  NotificationItem,
  Resource,
  ResourceSpecification,
  TimetableEntry,
  DayOfWeek,
} from "@/shared/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function toResource(row: any): Resource {
  if (!row) {
    throw new Error("The resource was saved, but Supabase returned no resource row.");
  }

  return {
    id: row.id,
    name: row.name,
    resourceType: row.resource_type ?? row.category_id ?? "classroom",
    location: row.location ?? "",
    capacity: row.capacity ?? 1,
    status: row.status,
    description: row.description ?? "",
    specifications: (row.specifications ?? {}) as ResourceSpecification,
    imageUrl: row.image_url ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toTimetableEntry(row: any): TimetableEntry {
  return {
    id: row.id,
    resourceId: row.resource_id,
    resourceName: row.resource_name ?? "",
    dayOfWeek: row.day_of_week as DayOfWeek,
    startTime: row.start_time,
    endTime: row.end_time,
    classSection: row.class_section ?? "",
    subject: row.subject ?? "",
    faculty: row.faculty ?? "",
    academicYear: row.academic_year ?? "",
  };
}

export function toBooking(row: any): BookingRequest {
  return {
    id: row.id,
    resourceId: row.resource_id,
    resourceName: row.resource_name ?? "",
    resourceLocation: row.resource_location ?? "",
    userId: row.user_id,
    userName: row.user_name ?? "",
    userRole: row.user_role,
    userEmail: row.user_email ?? "",
    userDepartment: row.user_department ?? "",
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    purpose: row.purpose,
    description: row.description ?? "",
    expectedCount: row.expected_count ?? 1,
    requiredEquipment: row.required_equipment ?? [],
    status: row.status,
    rejectionReason: row.rejection_reason ?? null,
    requestedAt: row.requested_at,
    reviewedAt: row.reviewed_at ?? null,
    reviewedBy: row.reviewed_by ?? null,
  };
}

export function toMaintenance(row: any): MaintenanceSchedule {
  return {
    id: row.id,
    resourceId: row.resource_id,
    resourceName: row.resource_name ?? "",
    title: row.title,
    startDate: row.start_date,
    endDate: row.end_date,
    startTime: row.start_time,
    endTime: row.end_time,
    reason: row.reason ?? "",
    createdAt: row.created_at,
  };
}

export function toNotification(row: any): NotificationItem {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    message: row.message ?? "",
    type: row.type,
    isRead: row.is_read,
    createdAt: row.created_at,
    bookingId: row.booking_id ?? null,
  };
}
