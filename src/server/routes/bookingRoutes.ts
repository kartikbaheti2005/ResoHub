import { Router, Response } from 'express';
import { bookingService } from '../services/bookingService';
import { authenticateToken, requireManager, AuthRequest } from '../middleware/auth';
import { validateBody, schemas } from '../middleware/validation';

export const bookingRouter = Router();

// Get bookings (filtered by user role)
bookingRouter.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const { status, resourceId } = req.query;
  const bookings = bookingService.getBookings(req.user!, {
    status: status as string,
    resourceId: resourceId as string,
  });
  res.json(bookings);
});

// Create booking request (authenticated teachers/students/CRs)
bookingRouter.post('/', authenticateToken, validateBody(schemas.createBooking), async (req: AuthRequest, res: Response) => {
  try {
    const booking = await bookingService.createBookingRequest(req.user!, req.body);
    res.status(201).json(booking);
  } catch (err: any) {
    res.status(err.status || 500).json({
      success: false,
      error: {
        code: err.code || 'BOOKING_FAILED',
        message: err.message || 'Failed to process booking request',
        details: err.details,
      },
    });
  }
});

// MANAGER ONLY: Review booking (Approve or Reject)
bookingRouter.put('/:id/status', authenticateToken, requireManager, validateBody(schemas.reviewBooking), async (req: AuthRequest, res: Response) => {
  try {
    const { status, reason } = req.body;
    const updated = await bookingService.updateBookingStatus(req.user!, req.params.id, status, reason);
    res.json(updated);
  } catch (err: any) {
    res.status(err.status || 500).json({
      success: false,
      error: {
        code: err.code || 'REVIEW_FAILED',
        message: err.message || 'Failed to update booking status',
        details: err.details,
      },
    });
  }
});

// Cancel booking (Requesting user or Manager)
bookingRouter.post('/:id/cancel', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const cancelled = await bookingService.cancelBooking(req.user!, req.params.id);
    res.json(cancelled);
  } catch (err: any) {
    res.status(err.status || 500).json({
      success: false,
      error: {
        code: err.code || 'CANCEL_FAILED',
        message: err.message || 'Failed to cancel booking',
      },
    });
  }
});
