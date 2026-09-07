import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issue = result.error.issues[0];
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `${issue.path.join('.')}: ${issue.message}`,
          details: result.error.format(),
        },
      });
    }
    req.body = result.data;
    next();
  };
}

// Schemas for API Requests
export const schemas = {
  login: z.object({
    email: z.string().email('Invalid email address format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
  }),

  register: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid college email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['TEACHER', 'STUDENT', 'CR']),
    department: z.string().optional().default('General Academic'),
  }),

  createResource: z.object({
    name: z.string().min(2, 'Resource name is required'),
    categoryId: z.string().min(1, 'Category ID is required'),
    location: z.string().min(2, 'Location is required'),
    capacity: z.number().int().positive('Capacity must be a positive integer'),
    status: z.enum(['AVAILABLE', 'UNAVAILABLE', 'MAINTENANCE']).optional().default('AVAILABLE'),
    description: z.string().optional().default(''),
    specifications: z.object({
      systemCount: z.number().optional().default(0),
      laptopCount: z.number().optional().default(0),
      hasProjector: z.boolean().optional().default(false),
      hasScreen: z.boolean().optional().default(false),
      hasAC: z.boolean().optional().default(false),
      hasInternet: z.boolean().optional().default(false),
      hasAudioSystem: z.boolean().optional().default(false),
      hasMicrophones: z.boolean().optional().default(false),
      hasSmartBoard: z.boolean().optional().default(false),
      installedSoftware: z.array(z.string()).optional().default([]),
      otherNotes: z.string().optional().default(''),
    }).optional().default({
      systemCount: 0,
      laptopCount: 0,
      hasProjector: false,
      hasScreen: false,
      hasAC: false,
      hasInternet: false,
      hasAudioSystem: false,
      hasMicrophones: false,
      hasSmartBoard: false,
      installedSoftware: [],
      otherNotes: '',
    }),
    imageUrl: z.string().url('Image URL must be valid').optional().default('https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=60'),
  }),

  createBooking: z.object({
    resourceId: z.string().min(1, 'Resource ID is required'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Start time must be HH:MM'),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'End time must be HH:MM'),
    purpose: z.string().min(3, 'Purpose must be at least 3 characters'),
    description: z.string().optional().default(''),
    expectedCount: z.number().int().positive().optional().default(1),
    requiredEquipment: z.array(z.string()).optional().default([]),
  }).refine((data) => {
    const [sH, sM] = data.startTime.split(':').map(Number);
    const [eH, eM] = data.endTime.split(':').map(Number);
    return eH * 60 + eM > sH * 60 + sM;
  }, {
    message: 'End time must be strictly after Start time',
    path: ['endTime'],
  }),

  reviewBooking: z.object({
    status: z.enum(['APPROVED', 'REJECTED']),
    reason: z.string().optional().default(''),
  }),

  createTimetable: z.object({
    resourceId: z.string().min(1, 'Resource ID is required'),
    dayOfWeek: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    subject: z.string().min(2, 'Subject name is required'),
    classSection: z.string().optional().default('General'),
    faculty: z.string().optional().default('Department Faculty'),
    academicYear: z.string().optional().default('2026-2027'),
  }).refine((data) => {
    const [sH, sM] = data.startTime.split(':').map(Number);
    const [eH, eM] = data.endTime.split(':').map(Number);
    return eH * 60 + eM > sH * 60 + sM;
  }, {
    message: 'End time must be strictly after Start time',
    path: ['endTime'],
  }),

  createMaintenance: z.object({
    resourceId: z.string().min(1, 'Resource ID is required'),
    title: z.string().min(2, 'Title is required'),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().default('08:00'),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().default('18:00'),
    reason: z.string().optional().default(''),
  }),
};
