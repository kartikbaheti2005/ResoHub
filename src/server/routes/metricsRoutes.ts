import { Router, Response } from 'express';
import { queryOne, queryAll } from '../db/database';
import { authenticateToken, requireManager, AuthRequest } from '../middleware/auth';
import { auditService } from '../services/auditService';

export const metricsRouter = Router();

metricsRouter.get('/dashboard', authenticateToken, requireManager, (req: AuthRequest, res: Response) => {
  const totalResources = (queryOne<any>('SELECT COUNT(*) as c FROM resources') || {}).c || 0;
  const availableResources = (queryOne<any>("SELECT COUNT(*) as c FROM resources WHERE status = 'AVAILABLE'") || {}).c || 0;
  const maintenanceResources = (queryOne<any>("SELECT COUNT(*) as c FROM resources WHERE status = 'MAINTENANCE'") || {}).c || 0;
  const pendingRequests = (queryOne<any>("SELECT COUNT(*) as c FROM bookings WHERE status = 'PENDING'") || {}).c || 0;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayApprovedBookings = (queryOne<any>("SELECT COUNT(*) as c FROM bookings WHERE status = 'APPROVED' AND date = ?", [todayStr]) || {}).c || 0;
  const upcomingBookings = (queryOne<any>("SELECT COUNT(*) as c FROM bookings WHERE status = 'APPROVED' AND date >= ?", [todayStr]) || {}).c || 0;

  const totalPossibleSlots = totalResources * 10; // Assuming 10 working hours per day
  const utilizationRate = totalPossibleSlots > 0 ? Math.min(100, Math.round((todayApprovedBookings / totalPossibleSlots) * 100)) : 0;

  res.json({
    totalResources,
    availableResources,
    maintenanceResources,
    pendingRequests,
    todayApprovedBookings,
    upcomingBookings,
    utilizationRate,
  });
});

metricsRouter.get('/audit-logs', authenticateToken, requireManager, (req: AuthRequest, res: Response) => {
  const logs = auditService.getLogs(100);
  res.json(logs);
});
