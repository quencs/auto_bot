import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { verifyKeyMiddleware } from 'discord-interactions';
import { fileURLToPath } from 'url';
import path from 'path';
import { connectDB } from './db.js';
import { handleInteraction } from './bot/handlers.js';
import { startGateway } from './bot/gateway.js';
import authRouter from './api/auth.js';
import guildsRouter from './api/guilds.js';
import { requireAuth } from './api/middleware.js';

// Validate required environment variables
const REQUIRED_ENV = ['PUBLIC_KEY', 'DISCORD_TOKEN', 'APP_ID', 'CLIENT_SECRET', 'SESSION_SECRET'];
for (const envVar of REQUIRED_ENV) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://cdn.discordapp.com'],
      connectSrc: ["'self'"],
    },
  },
}));

// CORS
const allowedOrigins = process.env.DASHBOARD_URL
  ? [process.env.DASHBOARD_URL]
  : [`http://localhost:${PORT}`];
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type'],
}));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many requests, please try again later' },
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60,
  message: { error: 'Too many requests, please try again later' },
});

// Middleware
app.use(cookieParser());

// Discord interactions endpoint (must use raw body for signature verification)
// Note: verifyKeyMiddleware handles its own body parsing, so this must come before express.json()
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), handleInteraction);

// JSON parsing for API routes
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/guilds', apiLimiter, requireAuth, guildsRouter);

// Serve React dashboard (static files)
const dashboardPath = path.join(__dirname, '..', 'dashboard', 'dist');
app.use('/dashboard', express.static(dashboardPath));
app.get('/dashboard/*', (req, res) => {
  res.sendFile(path.join(dashboardPath, 'index.html'));
});

// Redirect root to dashboard
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// Start server
async function start() {
  await connectDB();

  // Start Discord Gateway for events (welcome, logs)
  startGateway();

  app.listen(PORT, () => {
    console.log(`Teemate bot listening on port ${PORT}`);
  });
}

start();
