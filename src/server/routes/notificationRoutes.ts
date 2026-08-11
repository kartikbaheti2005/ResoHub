import { Router, Response } from 'express';
import { queryAll, queryOne, runQuery } from '../db/database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

export const notificationRouter = Router();

// Get user notifications
notificationRouter.get('/', authenticateToken, (req: AuthRequest, res: Response) => {
  const rows = queryAll(
    `SELECT id, user_id as userId, title, message, type, is_read as isRead,
            created_at as createdAt, booking_id as bookingId
     FROM notifications WHERE user_id = ? ORDER BY created_at DESC`,
    [req.user!.id]
  );

  res.json(rows.map((r: any) => ({ ...r, isRead: Boolean(r.isRead) })));
});

// Mark single notification as read
notificationRouter.post('/:id/read', authenticateToken, (req: AuthRequest, res: Response) => {
  runQuery('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user!.id]);
  res.json({ success: true });
});

// Mark all notifications as read
notificationRouter.post('/read-all', authenticateToken, (req: AuthRequest, res: Response) => {
  runQuery('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user!.id]);
  res.json({ success: true });
});
