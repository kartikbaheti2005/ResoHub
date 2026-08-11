import { Router, Response } from 'express';
import { resourceService } from '../services/resourceService';
import { availabilityService } from '../services/availabilityService';
import { authenticateToken, requireManager, AuthRequest } from '../middleware/auth';
import { validateBody, schemas } from '../middleware/validation';

export const resourceRouter = Router();

// Public: Get categories
resourceRouter.get('/categories', (req, res) => {
  res.json(resourceService.getCategories());
});

// Public: Get resources with optional filtering
resourceRouter.get('/', (req, res) => {
  const { category, search, minCapacity, status } = req.query;
  const resources = resourceService.getResources({
    category: category as string,
    search: search as string,
    minCapacity: minCapacity ? Number(minCapacity) : undefined,
    status: status as string,
  });
  res.json(resources);
});

// Check availability schedule matrix for a resource on a given date
resourceRouter.get('/:id/availability', (req, res) => {
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const resource = resourceService.getResourceById(req.params.id);

  if (!resource) {
    return res.status(404).json({ success: false, error: { message: 'Resource not found' } });
  }

  const timeline = availabilityService.calculateHourlyTimeline(req.params.id, date);
  res.json({
    resourceId: req.params.id,
    resourceName: resource.name,
    date,
    timeline,
  });
});

// Conflict check endpoint
resourceRouter.post('/check-conflict', (req, res) => {
  const { resourceId, date, startTime, endTime, excludeBookingId } = req.body;
  if (!resourceId || !date || !startTime || !endTime) {
    return res.status(400).json({ success: false, error: { message: 'resourceId, date, startTime, and endTime are required' } });
  }

  const result = availabilityService.checkConflict(resourceId, date, startTime, endTime, excludeBookingId);
  res.json(result);
});

// Public: Get single resource by ID
resourceRouter.get('/:id', (req, res) => {
  const resource = resourceService.getResourceById(req.params.id);
  if (!resource) {
    return res.status(404).json({ success: false, error: { message: 'Resource not found' } });
  }
  res.json(resource);
});

// MANAGER ONLY: Create resource
resourceRouter.post('/', authenticateToken, requireManager, validateBody(schemas.createResource), (req: AuthRequest, res: Response) => {
  try {
    const created = resourceService.createResource(req.user!, req.body);
    res.status(201).json(created);
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, error: { message: err.message || 'Server error' } });
  }
});

// MANAGER ONLY: Update resource
resourceRouter.put('/:id', authenticateToken, requireManager, (req: AuthRequest, res: Response) => {
  try {
    const updated = resourceService.updateResource(req.user!, req.params.id, req.body);
    res.json(updated);
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, error: { message: err.message || 'Server error' } });
  }
});

// MANAGER ONLY: Delete resource
resourceRouter.delete('/:id', authenticateToken, requireManager, (req: AuthRequest, res: Response) => {
  try {
    resourceService.deleteResource(req.user!, req.params.id);
    res.json({ message: 'Resource deleted successfully' });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, error: { message: err.message || 'Server error' } });
  }
});
