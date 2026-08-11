import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { getDb } from './src/server/db/database';
import { authRouter } from './src/server/routes/authRoutes';
import { resourceRouter } from './src/server/routes/resourceRoutes';
import { bookingRouter } from './src/server/routes/bookingRoutes';
import { timetableRouter } from './src/server/routes/timetableRoutes';
import { maintenanceRouter } from './src/server/routes/maintenanceRoutes';
import { notificationRouter } from './src/server/routes/notificationRoutes';
import { metricsRouter } from './src/server/routes/metricsRoutes';
import { apiLimiter } from './src/server/middleware/rateLimit';

async function startServer() {
  // Initialize SQLite Relational Database Engine
  await getDb();

  const app = express();
  app.set('trust proxy', 1);
  const PORT = 3000;

  // Security Middleware
  app.use(helmet({ contentSecurityPolicy: false })); // Disable CSP for Vite dev compatibility
  app.use(cors());
  app.use(express.json());

  // Global API Rate Limiter
  app.use('/api', apiLimiter);

  // Modular API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/resources', resourceRouter);
  app.use('/api/categories', (req, res) => {
    res.redirect(307, '/api/resources/categories');
  });
  app.use('/api/bookings', bookingRouter);
  app.use('/api/timetable', timetableRouter);
  app.use('/api/maintenance', maintenanceRouter);
  app.use('/api/notifications', notificationRouter);
  app.use('/api/metrics', metricsRouter);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', engine: 'SQLite Relational Database (sql.js)' });
  });

  // Catch-all 404 for any unhandled /api requests to prevent HTML fallthrough
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `API route ${req.originalUrl} not found` },
    });
  });

  // Global Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled express error:', err);
    res.status(err.status || 500).json({
      success: false,
      error: {
        code: err.code || 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An internal server error occurred',
      },
    });
  });

  // Vite middleware for development / Static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[ResoHub Server] Running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup failure:', err);
  process.exit(1);
});
