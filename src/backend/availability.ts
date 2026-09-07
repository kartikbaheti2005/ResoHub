import type { ConflictCheckResult, DayOfWeek, TimeSlotStatus } from "@/shared/types";
import type { Db } from "./client";

export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

/** Touching intervals (09:00-10:00 and 10:00-11:00) do NOT overlap. */
export function intervalsOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  return timeToMinutes(s1) < timeToMinutes(e2) && timeToMinutes(e1) > timeToMinutes(s2);
}

export function getDayOfWeekFromDate(dateStr: string): DayOfWeek {
  const [year, month, day] = dateStr.split("-").map(Number);
  const dateObj = new Date(year!, (month ?? 1) - 1, day ?? 1);
  const days: DayOfWeek[] = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return days[dateObj.getDay()]!;
}

export const HOURS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
];

export async function checkConflict(
  db: Db,
  resourceId: string,
  date: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string,
): Promise<ConflictCheckResult> {
  if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
    return { hasConflict: true, reason: "End time must be after the start time." };
  }

  const { data: resource } = await db
    .from("resources")
    .select("id, name, status")
    .eq("id", resourceId)
    .maybeSingle();

  if (!resource) {
    return {
      hasConflict: true,
      reason: "Requested resource does not exist.",
      conflictType: "RESOURCE_STATUS",
    };
  }
  if (resource.status === "UNAVAILABLE") {
    return {
      hasConflict: true,
      reason: "Resource is currently marked as Unavailable by the administrator.",
      conflictType: "RESOURCE_STATUS",
    };
  }
  if (resource.status === "MAINTENANCE") {
    return {
      hasConflict: true,
      reason: "Resource is currently under active Maintenance.",
      conflictType: "MAINTENANCE",
    };
  }

  const { data: maintenance } = await db
    .from("maintenance_schedules")
    .select("title, start_time, end_time, reason")
    .eq("resource_id", resourceId)
    .lte("start_date", date)
    .gte("end_date", date);

  for (const m of maintenance ?? []) {
    if (intervalsOverlap(startTime, endTime, m.start_time, m.end_time)) {
      return {
        hasConflict: true,
        reason: `Scheduled Maintenance Block: "${m.title}"`,
        conflictType: "MAINTENANCE",
        details: m.reason || "Ongoing facility maintenance",
      };
    }
  }

  const { data: timetable } = await db
    .from("timetable_entries")
    .select("subject, class_section, faculty, start_time, end_time")
    .eq("resource_id", resourceId)
    .eq("day_of_week", getDayOfWeekFromDate(date));

  for (const tt of timetable ?? []) {
    if (intervalsOverlap(startTime, endTime, tt.start_time, tt.end_time)) {
      return {
        hasConflict: true,
        reason: `College Timetable Occupation: ${tt.subject} (${tt.class_section})`,
        conflictType: "TIMETABLE",
        details: `Faculty: ${tt.faculty} | Regular Schedule ${tt.start_time} - ${tt.end_time}`,
      };
    }
  }

  let query = db
    .from("bookings")
    .select("id, user_name, user_role, purpose, start_time, end_time")
    .eq("resource_id", resourceId)
    .eq("date", date)
    .eq("status", "APPROVED");

  if (excludeBookingId) query = query.neq("id", excludeBookingId);

  const { data: approved } = await query;

  for (const bk of approved ?? []) {
    if (intervalsOverlap(startTime, endTime, bk.start_time, bk.end_time)) {
      return {
        hasConflict: true,
        reason: `Conflicting Approved Reservation: "${bk.purpose}"`,
        conflictType: "APPROVED_BOOKING",
        details: `Reserved by ${bk.user_name} (${bk.user_role}) | Time: ${bk.start_time} - ${bk.end_time}`,
      };
    }
  }

  return { hasConflict: false };
}

export async function buildHourlyTimeline(
  db: Db,
  resourceId: string,
  date: string,
): Promise<TimeSlotStatus[]> {
  const { data: resource } = await db
    .from("resources")
    .select("id, status")
    .eq("id", resourceId)
    .maybeSingle();
  if (!resource) return [];

  const [{ data: timetable }, { data: bookings }, { data: maintenance }] = await Promise.all([
    db
      .from("timetable_entries")
      .select("subject, class_section, faculty, start_time, end_time")
      .eq("resource_id", resourceId)
      .eq("day_of_week", getDayOfWeekFromDate(date)),
    db
      .from("bookings")
      .select("user_name, purpose, status, start_time, end_time")
      .eq("resource_id", resourceId)
      .eq("date", date)
      .in("status", ["APPROVED", "PENDING"]),
    db
      .from("maintenance_schedules")
      .select("title, start_time, end_time")
      .eq("resource_id", resourceId)
      .lte("start_date", date)
      .gte("end_date", date),
  ]);

  const slots: TimeSlotStatus[] = [];

  for (let i = 0; i < HOURS.length - 1; i++) {
    const slotStart = HOURS[i]!;
    const slotEnd = HOURS[i + 1]!;

    let status: TimeSlotStatus["status"] = "AVAILABLE";
    let details: string | undefined;
    let occupiedBy: string | undefined;

    if (resource.status === "MAINTENANCE" || resource.status === "UNAVAILABLE") {
      status = "MAINTENANCE";
      details = `Resource is marked as ${resource.status}`;
    } else {
      const m = (maintenance ?? []).find((x) =>
        intervalsOverlap(slotStart, slotEnd, x.start_time, x.end_time),
      );
      const tt = (timetable ?? []).find((x) =>
        intervalsOverlap(slotStart, slotEnd, x.start_time, x.end_time),
      );
      const approved = (bookings ?? []).find(
        (x) =>
          x.status === "APPROVED" && intervalsOverlap(slotStart, slotEnd, x.start_time, x.end_time),
      );
      const pending = (bookings ?? []).find(
        (x) =>
          x.status === "PENDING" && intervalsOverlap(slotStart, slotEnd, x.start_time, x.end_time),
      );

      if (m) {
        status = "MAINTENANCE";
        details = m.title;
      } else if (tt) {
        status = "TIMETABLE_OCCUPIED";
        details = `${tt.subject} (${tt.class_section})`;
        occupiedBy = `Faculty: ${tt.faculty}`;
      } else if (approved) {
        status = "APPROVED_BOOKING";
        details = approved.purpose;
        occupiedBy = `Reserved by ${approved.user_name}`;
      } else if (pending) {
        status = "PENDING_REQUEST";
        details = `Pending Request: ${pending.purpose}`;
        occupiedBy = `Requested by ${pending.user_name}`;
      }
    }

    slots.push({
      timeSlot: `${slotStart} - ${slotEnd}`,
      startTime: slotStart,
      endTime: slotEnd,
      status,
      details,
      occupiedBy,
    });
  }

  return slots;
}
