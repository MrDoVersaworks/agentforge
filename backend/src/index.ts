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

const app = express();

// ============================================================
// SECURITY & CORS
// ============================================================
app.use(helmet());
app.use(
  cors({
    origin: config.CORS_ORIGIN.includes(',')
      ? config.CORS_ORIGIN.split(',').map((o) => o.trim())
      : config.CORS_ORIGIN,
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

// ============================================================
// 404 HANDLER
// ============================================================
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: 'The requested API endpoint does not exist.',
  });
});

// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================
app.use(errorHandler);

// ============================================================
// START SERVER
// ============================================================
const PORT = parseInt(config.PORT, 10) || 5003;

app.listen(PORT, () => {
  logger.info('SERVER', `AgentForge Backend API running on port ${PORT}`);
  logger.info('SERVER', `Mode: ${config.NODE_ENV}`);
  logger.info('SERVER', `Configured CORS origin: ${config.CORS_ORIGIN}`);
});

export default app;
