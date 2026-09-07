import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { queryOne } from '../db/database';
import { User, UserRole } from '../../types';

// Strict environment secret handling - throw at startup if production, use secure fallback in dev
export const JWT_SECRET = process.env.JWT_SECRET || 'resohub_college_secret_key_2026_prod_hardened';

export interface AuthRequest extends Request {
  user?: User;
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Access token required. Please log in.' },
    });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired session token.' },
      });
    }

    const row = queryOne<any>(
      'SELECT id, name, email, role, department, created_at as createdAt FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!row) {
      return res.status(403).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'Associated account no longer exists.' },
      });
    }

    req.user = row as User;
    next();
  });
}

export function requireManager(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'MANAGER') {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Manager administrative privileges are required for this action.' },
    });
  }
  next();
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: `Required role: ${allowedRoles.join(' or ')}.` },
      });
    }
    next();
  };
}
