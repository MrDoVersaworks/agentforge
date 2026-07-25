import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';
import { logger } from './utils/logger.js';
import authRoutes from './routes/auth.routes.js';
import agentRoutes from './routes/agent.routes.js';
import knowledgeRoutes from './routes/knowledge.routes.js';
import chatRoutes from './routes/chat.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import publicRoutes from './routes/public.routes.js';
import adminRoutes from './routes/admin.routes.js';
import contactRoutes from './routes/contact.routes.js';

const app = express();

let corsOrigin: string | string[];
if (config.CORS_ORIGIN.includes(',')) {
  corsOrigin = config.CORS_ORIGIN.split(',').map((origin) => origin.trim().replace(/\/+$/, ''));
} else {
  corsOrigin = config.CORS_ORIGIN.trim().replace(/\/+$/, '');
}

// ============================================================
// SECURITY & CORS
// ============================================================
app.use((helmet as any)({
  contentSecurityPolicy: false,
  frameguard: { action: 'deny' },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ============================================================
// PARSING
// ============================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Apply global rate limiting to all /api/ requests
app.use('/api', apiRateLimiter);

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'agentforge-backend' });
});

// ============================================================
// API ROUTES
// ============================================================
app.use('/api/auth', authRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);

// ============================================================
// 404 HANDLER
// ============================================================
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: '[ERR_ROUTE_NOT_FOUND] The requested API endpoint does not exist.',
  });
});

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================
app.use(errorHandler);

// ============================================================
// START SERVER
// ============================================================
app.listen(config.PORT, () => {
  logger.info('SERVER', 'AgentForge Backend API running on port ' + config.PORT);
  logger.info('SERVER', 'Mode: ' + config.NODE_ENV);
  logger.info('SERVER', 'Configured CORS origin: ' + config.CORS_ORIGIN);
});

export default app;