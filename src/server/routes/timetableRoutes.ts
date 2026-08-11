import { Router, Response } from 'express';
import { queryAll, queryOne, runQuery } from '../db/database';
import { authenticateToken, requireManager, AuthRequest } from '../middleware/auth';
import { validateBody, schemas } from '../middleware/validation';
import { auditService } from '../services/auditService';

export const timetableRouter = Router();

// Public: Get timetable
timetableRouter.get('/', (req, res) => {
  const { resourceId } = req.query;
  let sql = `SELECT id, resource_id as resourceId, resource_name as resourceName, day_of_week as dayOfWeek,
                    start_time as startTime, end_time as endTime, class_section as classSection,
                    subject, faculty, academic_year as academicYear
             FROM timetable_entries WHERE 1=1`;
  const params: any[] = [];

  if (resourceId) {
    sql += ` AND resource_id = ?`;
    params.push(resourceId);
  }

  sql += ` ORDER BY day_of_week, start_time`;

  res.json(queryAll(sql, params));
});

// MANAGER ONLY: Add timetable entry
timetableRouter.post('/', authenticateToken, requireManager, validateBody(schemas.createTimetable), (req: AuthRequest, res: Response) => {
  const { resourceId, dayOfWeek, startTime, endTime, subject, classSection, faculty, academicYear } = req.body;

  const resource = queryOne<any>('SELECT name FROM resources WHERE id = ?', [resourceId]);
  if (!resource) {
    return res.status(404).json({ success: false, error: { message: 'Resource not found' } });
  }

  const id = 'tt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

  runQuery(
    `INSERT INTO timetable_entries (id, resource_id, resource_name, day_of_week, start_time, end_time, class_section, subject, faculty, academic_year)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, resourceId, resource.name, dayOfWeek, startTime, endTime, classSection, subject, faculty, academicYear]
  );

  auditService.log(req.user!, 'CREATE_TIMETABLE_ENTRY', 'timetable', id, { resourceId, subject, dayOfWeek });

  const created = queryOne(
    `SELECT id, resource_id as resourceId, resource_name as resourceName, day_of_week as dayOfWeek,
            start_time as startTime, end_time as endTime, class_section as classSection,
            subject, faculty, academic_year as academicYear
     FROM timetable_entries WHERE id = ?`,
    [id]
  );

  res.status(201).json(created);
});

// MANAGER ONLY: Delete timetable entry
timetableRouter.delete('/:id', authenticateToken, requireManager, (req: AuthRequest, res: Response) => {
  const existing = queryOne('SELECT id FROM timetable_entries WHERE id = ?', [req.params.id]);
  if (!existing) {
    return res.status(404).json({ success: false, error: { message: 'Timetable entry not found' } });
  }

  runQuery('DELETE FROM timetable_entries WHERE id = ?', [req.params.id]);
  auditService.log(req.user!, 'DELETE_TIMETABLE_ENTRY', 'timetable', req.params.id);

  res.json({ message: 'Timetable entry removed successfully' });
});
