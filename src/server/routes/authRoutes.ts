import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { queryOne, runQuery } from '../db/database';
import { authenticateToken, JWT_SECRET, AuthRequest } from '../middleware/auth';
import { validateBody, schemas } from '../middleware/validation';
import { authLimiter } from '../middleware/rateLimit';
import { auditService } from '../services/auditService';
import { User } from '../../types';

export const authRouter = Router();

authRouter.post('/login', authLimiter, validateBody(schemas.login), (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = queryOne<any>(
    'SELECT id, name, email, password_hash as passwordHash, role, department, created_at as createdAt FROM users WHERE LOWER(email) = LOWER(?)',
    [email]
  );

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' },
    });
  }

  const userPayload: User = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    createdAt: user.createdAt,
  };

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '1d' } // Expire in 1 day for production security
  );

  auditService.log(userPayload, 'USER_LOGIN', 'user', user.id);

  res.json({ token, user: userPayload });
});

authRouter.post('/register', authLimiter, validateBody(schemas.register), (req: Request, res: Response) => {
  const { name, email, password, role, department } = req.body;

  const existing = queryOne<any>('SELECT id FROM users WHERE LOWER(email) = LOWER(?)', [email]);
  if (existing) {
    return res.status(400).json({
      success: false,
      error: { code: 'EMAIL_IN_USE', message: 'College email is already registered.' },
    });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);
  const userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const createdAt = new Date().toISOString();

  runQuery(
    'INSERT INTO users (id, name, email, password_hash, role, department, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [userId, name, email, passwordHash, role, department || 'General Academic', createdAt]
  );

  const newAuthUser: User = {
    id: userId,
    name,
    email,
    role,
    department: department || 'General Academic',
    createdAt,
  };

  const token = jwt.sign(
    { id: userId, email, role },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  auditService.log(newAuthUser, 'USER_REGISTER', 'user', userId);

  res.status(201).json({ token, user: newAuthUser });
});

authRouter.get('/me', authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({ user: req.user });
});
