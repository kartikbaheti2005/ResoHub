import { queryAll, queryOne } from '../db/database';
import { DayOfWeek, TimeSlotStatus } from '../../types';

export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

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

  // Boundary condition: If interval 1 ends exactly when interval 2 starts, or starts when interval 2 ends,
  // they do NOT overlap (e.g., 09:00-10:00 and 10:00-11:00 do not conflict).
  return s1 < e2 && e1 > s2;
}

export function getDayOfWeekFromDate(dateStr: string): DayOfWeek {
  // Use YYYY, MM, DD integer splitting to prevent UTC timezone shifts on servers
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const days: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dateObj.getDay()];
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  reason?: string;
  conflictType?: 'MAINTENANCE' | 'TIMETABLE' | 'APPROVED_BOOKING' | 'RESOURCE_STATUS';
  details?: string;
}

export const availabilityService = {
  checkConflict: (
    resourceId: string,
    date: string,      // YYYY-MM-DD
    startTime: string, // HH:MM
    endTime: string,   // HH:MM
    excludeBookingId?: string
  ): ConflictCheckResult => {
    // 1. Fetch resource status
    const resource = queryOne<any>('SELECT id, name, status FROM resources WHERE id = ?', [resourceId]);
    if (!resource) {
      return {
        hasConflict: true,
        reason: 'Requested resource does not exist.',
        conflictType: 'RESOURCE_STATUS',
      };
    }

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
        reason: 'Resource is currently under active Maintenance.',
        conflictType: 'MAINTENANCE',
      };
    }

    // 2. Check Maintenance Schedules
    const maintenanceRows = queryAll<any>(
      `SELECT title, start_date, end_date, start_time, end_time, reason 
       FROM maintenance_schedules 
       WHERE resource_id = ? AND start_date <= ? AND end_date >= ?`,
      [resourceId, date, date]
    );

    for (const m of maintenanceRows) {
      if (intervalsOverlap(startTime, endTime, m.start_time, m.end_time)) {
        return {
          hasConflict: true,
          reason: `Scheduled Maintenance Block: "${m.title}"`,
          conflictType: 'MAINTENANCE',
          details: m.reason || 'Ongoing facility maintenance',
        };
      }
    }

    // 3. Check College Timetable
    const dayOfWeek = getDayOfWeekFromDate(date);
    const timetableRows = queryAll<any>(
      `SELECT subject, class_section as classSection, faculty, start_time as startTime, end_time as endTime
       FROM timetable_entries
       WHERE resource_id = ? AND day_of_week = ?`,
      [resourceId, dayOfWeek]
    );

    for (const tt of timetableRows) {
      if (intervalsOverlap(startTime, endTime, tt.startTime, tt.endTime)) {
        return {
          hasConflict: true,
          reason: `College Timetable Occupation: ${tt.subject} (${tt.classSection})`,
          conflictType: 'TIMETABLE',
          details: `Faculty: ${tt.faculty} | Regular Schedule ${tt.startTime} - ${tt.endTime}`,
        };
      }
    }

    // 4. Check Approved Bookings
    let bookingQuery = `SELECT id, user_name as userName, user_role as userRole, purpose, start_time as startTime, end_time as endTime
                        FROM bookings 
                        WHERE resource_id = ? AND date = ? AND status = 'APPROVED'`;
    const params: any[] = [resourceId, date];

    if (excludeBookingId) {
      bookingQuery += ` AND id != ?`;
      params.push(excludeBookingId);
    }

    const approvedBookings = queryAll<any>(bookingQuery, params);

    for (const bk of approvedBookings) {
      if (intervalsOverlap(startTime, endTime, bk.startTime, bk.endTime)) {
        return {
          hasConflict: true,
          reason: `Conflicting Approved Reservation: "${bk.purpose}"`,
          conflictType: 'APPROVED_BOOKING',
          details: `Reserved by ${bk.userName} (${bk.userRole}) | Time: ${bk.startTime} - ${bk.endTime}`,
        };
      }
    }

    return { hasConflict: false };
  },

  calculateHourlyTimeline: (resourceId: string, date: string): TimeSlotStatus[] => {
    const resource = queryOne<any>('SELECT id, name, status FROM resources WHERE id = ?', [resourceId]);
    if (!resource) return [];

    const hours = [
      '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
      '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
    ];

    const dayOfWeek = getDayOfWeekFromDate(date);
    const timetableEntries = queryAll<any>(
      `SELECT subject, class_section as classSection, faculty, start_time as startTime, end_time as endTime
       FROM timetable_entries WHERE resource_id = ? AND day_of_week = ?`,
      [resourceId, dayOfWeek]
    );

    const bookingsOnDate = queryAll<any>(
      `SELECT user_name as userName, purpose, status, start_time as startTime, end_time as endTime
       FROM bookings WHERE resource_id = ? AND date = ? AND status IN ('APPROVED', 'PENDING')`,
      [resourceId, date]
    );

    const maintenanceList = queryAll<any>(
      `SELECT title, start_time as startTime, end_time as endTime
       FROM maintenance_schedules WHERE resource_id = ? AND start_date <= ? AND end_date >= ?`,
      [resourceId, date, date]
    );

    const slots: TimeSlotStatus[] = [];

    for (let i = 0; i < hours.length - 1; i++) {
      const slotStart = hours[i];
      const slotEnd = hours[i + 1];
      const timeSlot = `${slotStart} - ${slotEnd}`;

      let status: TimeSlotStatus['status'] = 'AVAILABLE';
      let details: string | undefined = undefined;
      let occupiedBy: string | undefined = undefined;

      if (resource.status === 'MAINTENANCE' || resource.status === 'UNAVAILABLE') {
        status = 'MAINTENANCE';
        details = `Resource is marked as ${resource.status}`;
      } else {
        const mMatch = maintenanceList.find((m) => intervalsOverlap(slotStart, slotEnd, m.startTime, m.endTime));
        if (mMatch) {
          status = 'MAINTENANCE';
          details = mMatch.title;
        } else {
          const ttMatch = timetableEntries.find((tt) => intervalsOverlap(slotStart, slotEnd, tt.startTime, tt.endTime));
          if (ttMatch) {
            status = 'TIMETABLE_OCCUPIED';
            details = `${ttMatch.subject} (${ttMatch.classSection})`;
            occupiedBy = `Faculty: ${ttMatch.faculty}`;
          } else {
            const appMatch = bookingsOnDate.find((b) => b.status === 'APPROVED' && intervalsOverlap(slotStart, slotEnd, b.startTime, b.endTime));
            if (appMatch) {
              status = 'APPROVED_BOOKING';
              details = appMatch.purpose;
              occupiedBy = `Reserved by ${appMatch.userName}`;
            } else {
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
        timeSlot,
        startTime: slotStart,
        endTime: slotEnd,
        status,
        details,
        occupiedBy,
      });
    }

    return slots;
  },
};
