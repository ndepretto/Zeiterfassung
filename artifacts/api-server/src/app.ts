import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import session from "express-session";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Restrict CORS to known origins only (Replit dev domain + localhost).
// In production the frontend is served from the same origin, so CORS isn't
// needed at all — the allowlist is still kept narrow for safety.
const allowedOrigins = new Set<string>(
  [
    process.env["REPLIT_DEV_DOMAIN"]
      ? `https://${process.env["REPLIT_DEV_DOMAIN"]}`
      : null,
    "http://localhost:3000",
    "http://localhost:5173",
  ].filter(Boolean) as string[],
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Same-origin requests (no Origin header) are always allowed.
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionSecret = process.env["SESSION_SECRET"];
if (!sessionSecret) throw new Error("SESSION_SECRET is required");

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env["NODE_ENV"] === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  }),
);

// Auth guard — allow /auth/* and /healthz without login
app.use("/api", (req: Request, res: Response, next: NextFunction): void => {
  const open = req.path.startsWith("/auth/") || req.path === "/healthz";
  if (open) return next();
  if ((req.session as any).authenticated === true) return next();
  res.status(401).json({ error: "Nicht angemeldet" });
});

app.use("/api", router);

export default app;
