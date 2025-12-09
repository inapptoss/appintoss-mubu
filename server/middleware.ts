import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { v4 as uuid } from "uuid";
import type { Request, Response, NextFunction } from "express";

// CORS configuration: whitelist trusted origins in production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? (process.env.ALLOWED_ORIGINS?.split(',') || ['https://*.replit.app', 'https://*.repl.co'])
    : true,
  credentials: true,
};

export const commonMiddleware = [
  // Helmet with relaxed CSP for development (allows Vite HMR and inline scripts)
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  }),
  cors(corsOptions),
  morgan("tiny"),
  // 요청 ID
  (req: Request, _res: Response, next: NextFunction) => {
    (req as any).reqId = uuid();
    next();
  },
  // Rate limiting: enabled in all environments with appropriate settings
  rateLimit({ 
    windowMs: 60_000, 
    max: process.env.NODE_ENV === 'production' ? 60 : 1000,
    standardHeaders: true,
    skipFailedRequests: process.env.NODE_ENV !== 'production',
  }),
];

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  console.error("[ERR]", err?.message || err);
  res.status(err?.status || 500).json({ ok: false, error: "SERVER_ERROR" });
}
