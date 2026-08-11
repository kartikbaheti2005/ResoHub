import { queryAll, queryOne, runQuery, dbMutex } from '../db/database';
import { availabilityService } from './availabilityService';
import { auditService } from './auditService';
import { BookingRequest, BookingStatus, User } from '../../types';

export const bookingService = {
  createBookingRequest: async (
    user: User,
    data: {
      resourceId: string;
      date: string;
      startTime: string;
      endTime: string;
      purpose: string;
      description?: string;
      expectedCount?: number;
      requiredEquipment?: string[];
    }
  ): Promise<BookingRequest> => {
    // Acquire mutex lock for atomic transactional conflict check & write
    const releaseLock = await dbMutex.acquire();

    try {
      // 1. Fetch resource
      const resource = queryOne<any>('SELECT id, name, location FROM resources WHERE id = ?', [data.resourceId]);
      if (!resource) {
        throw { code: 'RESOURCE_NOT_FOUND', status: 404, message: 'The requested resource was not found.' };
      }

      // 2. Strict conflict check inside atomic transaction
      const conflict = availabilityService.checkConflict(data.resourceId, data.date, data.startTime, data.endTime);
      if (conflict.hasConflict) {
        throw {
          code: 'BOOKING_CONFLICT',
          status: 409,
          message: conflict.reason || 'Resource is not available for the requested time slot.',
          details: conflict.details,
        };
      }

      const bookingId = 'bk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const requestedAt = new Date().toISOString();
      const requiredEquipJson = JSON.stringify(data.requiredEquipment || []);

      runQuery(
        `INSERT INTO bookings (
          id, resource_id, resource_name, resource_location,
          user_id, user_name, user_role, user_email, user_department,
          date, start_time, end_time, purpose, description,
          expected_count, required_equipment, status, requested_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)`,
        [
          bookingId,
          resource.id,
          resource.name,
          resource.location,
          user.id,
          user.name,
          user.role,
          user.email,
          user.department,
          data.date,
          data.startTime,
          data.endTime,
          data.purpose,
          data.description || '',
          data.expectedCount || 1,
          requiredEquipJson,
          requestedAt,
        ]
      );

      // Notify managers
      const managers = queryAll<any>("SELECT id FROM users WHERE role = 'MANAGER'");
      const notifTime = new Date().toISOString();
      for (const m of managers) {
        const notifId = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        runQuery(
          `INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at, booking_id)
           VALUES (?, ?, ?, ?, 'REQUEST_CREATED', 0, ?, ?)`,
          [
            notifId,
            m.id,
            'New Booking Request',
            `${user.name} (${user.role}) requested ${resource.name} for ${data.date} (${data.startTime} - ${data.endTime}).`,
            notifTime,
            bookingId,
          ]
        );
      }

      auditService.log(user, 'CREATE_BOOKING_REQUEST', 'booking', bookingId, {
        resourceId: resource.id,
        date: data.date,
        timeSlot: `${data.startTime}-${data.endTime}`,
      });

      return bookingService.getBookingById(bookingId)!;
    } finally {
      releaseLock();
    }
  },

  updateBookingStatus: async (
    reviewer: User,
    bookingId: string,
    newStatus: 'APPROVED' | 'REJECTED',
    reason?: string
  ): Promise<BookingRequest> => {
    const releaseLock = await dbMutex.acquire();

    try {
      const booking = queryOne<any>('SELECT * FROM bookings WHERE id = ?', [bookingId]);
      if (!booking) {
        throw { code: 'NOT_FOUND', status: 404, message: 'Booking request not found.' };
      }

      // STATE MACHINE TRANSITION ENFORCEMENT
      // Allowed transitions: PENDING -> APPROVED, PENDING -> REJECTED
      if (booking.status !== 'PENDING') {
        throw {
          code: 'INVALID_STATE_TRANSITION',
          status: 400,
          message: `Cannot change status of a booking that is currently '${booking.status}'. Only 'PENDING' requests can be reviewed.`,
        };
      }

      // RE-VERIFY CONFLICT BEFORE APPROVING
      if (newStatus === 'APPROVED') {
        const conflict = availabilityService.checkConflict(
          booking.resource_id,
          booking.date,
          booking.start_time,
          booking.end_time,
          bookingId
        );

        if (conflict.hasConflict) {
          throw {
            code: 'SCHEDULE_CONFLICT',
            status: 409,
            message: `Cannot approve request due to schedule conflict: ${conflict.reason}`,
            details: conflict.details,
          };
        }
      }

      const reviewedAt = new Date().toISOString();
      runQuery(
        `UPDATE bookings SET status = ?, reviewed_at = ?, reviewed_by = ?, rejection_reason = ? WHERE id = ?`,
        [newStatus, reviewedAt, reviewer.name, reason || '', bookingId]
      );

      // Create notification for requesting user
      const notifId = 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const title = newStatus === 'APPROVED' ? 'Booking Request Approved! 🎉' : 'Booking Request Declined';
      const msg =
        newStatus === 'APPROVED'
          ? `Your reservation request for ${booking.resource_name} on ${booking.date} (${booking.start_time} - ${booking.end_time}) was APPROVED by ${reviewer.name}.`
          : `Your request for ${booking.resource_name} on ${booking.date} was rejected. Reason: ${reason || 'No specific reason provided.'}`;

      runQuery(
        `INSERT INTO notifications (id, user_id, title, message, type, is_read, created_at, booking_id)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?)`,
        [notifId, booking.user_id, title, msg, newStatus === 'APPROVED' ? 'APPROVAL' : 'REJECTION', reviewedAt, bookingId]
      );

      auditService.log(reviewer, `REVIEW_BOOKING_${newStatus}`, 'booking', bookingId, {
        previousStatus: booking.status,
        newStatus,
        reason,
      });

      return bookingService.getBookingById(bookingId)!;
    } finally {
      releaseLock();
    }
  },

  cancelBooking: async (user: User, bookingId: string): Promise<BookingRequest> => {
    const releaseLock = await dbMutex.acquire();

    try {
      const booking = queryOne<any>('SELECT * FROM bookings WHERE id = ?', [bookingId]);
      if (!booking) {
        throw { code: 'NOT_FOUND', status: 404, message: 'Booking not found.' };
      }

      // Authorization check
      if (booking.user_id !== user.id && user.role !== 'MANAGER') {
        throw { code: 'FORBIDDEN', status: 403, message: 'You are not authorized to cancel this booking.' };
      }

      // STATE MACHINE TRANSITION ENFORCEMENT
      // Allowed from PENDING or APPROVED. Forbidden if COMPLETED, CANCELLED, or REJECTED.
      if (['COMPLETED', 'CANCELLED', 'REJECTED'].includes(booking.status)) {
        throw {
          code: 'INVALID_STATE_TRANSITION',
          status: 400,
          message: `Cannot cancel booking currently in '${booking.status}' status.`,
        };
      }

      const cancelledAt = new Date().toISOString();
      runQuery(
        `UPDATE bookings SET status = 'CANCELLED', reviewed_at = ?, reviewed_by = ? WHERE id = ?`,
        [cancelledAt, user.name, bookingId]
      );

      auditService.log(user, 'CANCEL_BOOKING', 'booking', bookingId, {
        previousStatus: booking.status,
      });

      return bookingService.getBookingById(bookingId)!;
    } finally {
      releaseLock();
    }
  },

  getBookings: (user: User, filters?: { status?: string; resourceId?: string }): BookingRequest[] => {
    let sql = `SELECT id, resource_id as resourceId, resource_name as resourceName, resource_location as resourceLocation,
                      user_id as userId, user_name as userName, user_role as userRole, user_email as userEmail,
                      user_department as userDepartment, date, start_time as startTime, end_time as endTime,
                      purpose, description, expected_count as expectedCount, required_equipment as requiredEquipment,
                      status, rejection_reason as rejectionReason, requested_at as requestedAt,
                      reviewed_at as reviewedAt, reviewed_by as reviewedBy
               FROM bookings WHERE 1=1`;
    const params: any[] = [];

    // Privacy/Authorization scope: non-managers only see their own bookings
    if (user.role !== 'MANAGER') {
      sql += ` AND user_id = ?`;
      params.push(user.id);
    }

    if (filters?.status) {
      sql += ` AND status = ?`;
      params.push(filters.status);
    }

    if (filters?.resourceId) {
      sql += ` AND resource_id = ?`;
      params.push(filters.resourceId);
    }

    sql += ` ORDER BY requested_at DESC`;

    const rows = queryAll<any>(sql, params);
    return rows.map((r) => ({
      ...r,
      requiredEquipment: r.requiredEquipment ? JSON.parse(r.requiredEquipment) : [],
    }));
  },

  getBookingById: (id: string): BookingRequest | null => {
    const row = queryOne<any>(
      `SELECT id, resource_id as resourceId, resource_name as resourceName, resource_location as resourceLocation,
              user_id as userId, user_name as userName, user_role as userRole, user_email as userEmail,
              user_department as userDepartment, date, start_time as startTime, end_time as endTime,
              purpose, description, expected_count as expectedCount, required_equipment as requiredEquipment,
              status, rejection_reason as rejectionReason, requested_at as requestedAt,
              reviewed_at as reviewedAt, reviewed_by as reviewedBy
       FROM bookings WHERE id = ?`,
      [id]
    );

    if (!row) return null;

    return {
      ...row,
      requiredEquipment: row.requiredEquipment ? JSON.parse(row.requiredEquipment) : [],
    };
  },
};
