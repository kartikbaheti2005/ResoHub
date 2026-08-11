import { Router, Response } from 'express';
import { queryAll, queryOne, runQuery } from '../db/database';
import { authenticateToken, requireManager, AuthRequest } from '../middleware/auth';
import { validateBody, schemas } from '../middleware/validation';
import { auditService } from '../services/auditService';

export const maintenanceRouter = Router();

// Public: Get maintenance schedules
maintenanceRouter.get('/', (req, res) => {
  const rows = queryAll(
    `SELECT id, resource_id as resourceId, resource_name as resourceName, title,
            start_date as startDate, end_date as endDate, start_time as startTime,
            end_time as endTime, reason, created_at as createdAt
     FROM maintenance_schedules ORDER BY start_date DESC`
  );
  res.json(rows);
});

// MANAGER ONLY: Create maintenance schedule
maintenanceRouter.post('/', authenticateToken, requireManager, validateBody(schemas.createMaintenance), (req: AuthRequest, res: Response) => {
  const { resourceId, title, startDate, endDate, startTime, endTime, reason } = req.body;

  const resource = queryOne<any>('SELECT name FROM resources WHERE id = ?', [resourceId]);
  if (!resource) {
    return res.status(404).json({ success: false, error: { message: 'Resource not found' } });
  }

  const id = 'maint_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const createdAt = new Date().toISOString();

  runQuery(
    `INSERT INTO maintenance_schedules (id, resource_id, resource_name, title, start_date, end_date, start_time, end_time, reason, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, resourceId, resource.name, title, startDate, endDate, startTime, endTime, reason || '', createdAt]
  );

  auditService.log(req.user!, 'CREATE_MAINTENANCE_SCHEDULE', 'maintenance', id, { resourceId, title });

  const created = queryOne(
    `SELECT id, resource_id as resourceId, resource_name as resourceName, title,
            start_date as startDate, end_date as endDate, start_time as startTime,
            end_time as endTime, reason, created_at as createdAt
     FROM maintenance_schedules WHERE id = ?`,
    [id]
  );

  res.status(201).json(created);
});
