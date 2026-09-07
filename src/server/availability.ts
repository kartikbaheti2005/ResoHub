import { dbStore } from './db';
import { DayOfWeek, TimeSlotStatus } from '../types';

// Convert "HH:MM" to minutes from midnight for easy interval overlap checks
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Check if two time intervals [start1, end1] and [start2, end2] overlap
export function intervalsOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);

  return s1 < e2 && e1 > s2;
}

// Get day of week string from YYYY-MM-DD
export function getDayOfWeekFromDate(dateStr: string): DayOfWeek {
  const dateObj = new Date(dateStr + 'T00:00:00');
  const days: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dateObj.getDay()];
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  reason?: string;
  conflictType?: 'MAINTENANCE' | 'TIMETABLE' | 'APPROVED_BOOKING' | 'RESOURCE_STATUS';
  details?: string;
}

// BACKEND CONFLICT PREVENTION ENGINE
export function checkResourceConflict(
  resourceId: string,
  date: string, // YYYY-MM-DD
  startTime: string, // HH:MM
  endTime: string, // HH:MM
  excludeBookingId?: string
): ConflictCheckResult {
  const resource = dbStore.getResourceById(resourceId);
  if (!resource) {
    return {
      hasConflict: true,
      reason: 'Resource not found',
      conflictType: 'RESOURCE_STATUS',
    };
  }

  // 1. Check overall resource status
  if (resource.status === 'UNAVAILABLE') {
    return {
      hasConflict: true,
      reason: 'Resource is currently marked as Unavailable by the administrator.',
      conflictType: 'RESOURCE_STATUS',
    };
  }

  if (resource.status === 'MAINTENANCE') {
    return {
      hasConflict: true,
      reason: 'Resource is currently under Maintenance.',
      conflictType: 'MAINTENANCE',
    };
  }

  // 2. Check Maintenance Schedules
  const maintenanceList = dbStore.getMaintenanceSchedules().filter((m) => m.resourceId === resourceId);
  for (const m of maintenanceList) {
    if (date >= m.startDate && date <= m.endDate) {
      if (intervalsOverlap(startTime, endTime, m.startTime, m.endTime)) {
        return {
          hasConflict: true,
          reason: `Resource under maintenance: "${m.title}"`,
          conflictType: 'MAINTENANCE',
          details: m.reason,
        };
      }
    }
  }

  // 3. Check College Timetable
  const dayOfWeek = getDayOfWeekFromDate(date);
  const timetableEntries = dbStore
    .getTimetableForResource(resourceId)
    .filter((t) => t.dayOfWeek === dayOfWeek);

  for (const tt of timetableEntries) {
    if (intervalsOverlap(startTime, endTime, tt.startTime, tt.endTime)) {
      return {
        hasConflict: true,
        reason: `Occupied by College Timetable: ${tt.subject} (${tt.classSection})`,
        conflictType: 'TIMETABLE',
        details: `Faculty: ${tt.faculty} | Scheduled ${tt.startTime} - ${tt.endTime}`,
      };
    }
  }

  // 4. Check Approved Bookings
  const existingBookings = dbStore
    .getBookingsForResource(resourceId)
    .filter(
      (b) =>
        b.date === date &&
        b.status === 'APPROVED' &&
        b.id !== excludeBookingId
    );

  for (const bk of existingBookings) {
    if (intervalsOverlap(startTime, endTime, bk.startTime, bk.endTime)) {
      return {
        hasConflict: true,
        reason: `Already reserved: ${bk.purpose}`,
        conflictType: 'APPROVED_BOOKING',
        details: `Booked by ${bk.userName} (${bk.userRole}) | Approved Reservation`,
      };
    }
  }

  return { hasConflict: false };
}

// Generate hour-by-hour timeline matrix for a resource on a specific date (e.g., 08:00 to 20:00)
export function calculateHourlyTimeline(
  resourceId: string,
  date: string // YYYY-MM-DD
): TimeSlotStatus[] {
  const resource = dbStore.getResourceById(resourceId);
  if (!resource) return [];

  const slots: TimeSlotStatus[] = [];
  const hours = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
  ];

  const dayOfWeek = getDayOfWeekFromDate(date);
  const timetableEntries = dbStore
    .getTimetableForResource(resourceId)
    .filter((t) => t.dayOfWeek === dayOfWeek);

  const bookingsOnDate = dbStore
    .getBookingsForResource(resourceId)
    .filter((b) => b.date === date);

  const maintenanceList = dbStore
    .getMaintenanceSchedules()
    .filter((m) => m.resourceId === resourceId);

  for (let i = 0; i < hours.length - 1; i++) {
    const slotStart = hours[i];
    const slotEnd = hours[i + 1];
    const slotLabel = `${slotStart} - ${slotEnd}`;

    // Default status
    let status: TimeSlotStatus['status'] = 'AVAILABLE';
    let details: string | undefined = undefined;
    let occupiedBy: string | undefined = undefined;

    // Check if resource is generally offline/maintenance
    if (resource.status === 'MAINTENANCE' || resource.status === 'UNAVAILABLE') {
      status = 'MAINTENANCE';
      details = `Resource is marked as ${resource.status}`;
    } else {
      // Check maintenance schedule
      const mMatch = maintenanceList.find((m) => date >= m.startDate && date <= m.endDate && intervalsOverlap(slotStart, slotEnd, m.startTime, m.endTime));
      if (mMatch) {
        status = 'MAINTENANCE';
        details = mMatch.title;
      } else {
        // Check Timetable
        const ttMatch = timetableEntries.find((tt) => intervalsOverlap(slotStart, slotEnd, tt.startTime, tt.endTime));
        if (ttMatch) {
          status = 'TIMETABLE_OCCUPIED';
          details = `${ttMatch.subject} (${ttMatch.classSection})`;
          occupiedBy = `Faculty: ${ttMatch.faculty}`;
        } else {
          // Check Approved Bookings
          const appMatch = bookingsOnDate.find((b) => b.status === 'APPROVED' && intervalsOverlap(slotStart, slotEnd, b.startTime, b.endTime));
          if (appMatch) {
            status = 'APPROVED_BOOKING';
            details = appMatch.purpose;
            occupiedBy = `Reserved by ${appMatch.userName}`;
          } else {
            // Check Pending Requests
            const pendMatch = bookingsOnDate.find((b) => b.status === 'PENDING' && intervalsOverlap(slotStart, slotEnd, b.startTime, b.endTime));
            if (pendMatch) {
              status = 'PENDING_REQUEST';
              details = `Pending Request: ${pendMatch.purpose}`;
              occupiedBy = `Requested by ${pendMatch.userName}`;
            }
          }
        }
      }
    }

    slots.push({
      timeSlot: slotLabel,
      startTime: slotStart,
      endTime: slotEnd,
      status,
      details,
      occupiedBy,
    });
  }

  return slots;
}
