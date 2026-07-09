import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

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

app.use(
  cors({
    origin: (origin, callback) => {
      // Same-origin requests (no Origin header) are always allowed.
      if (!origin) return callback(null, true);
      // Allow any Replit hosted domain (dev previews + deployed apps) and localhost.
      if (
        origin.endsWith(".replit.dev") ||
        origin.endsWith(".replit.app") ||
        origin.startsWith("http://localhost:")
      ) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const sessionSecret = process.env["SESSION_SECRET"];
if (!sessionSecret) throw new Error("SESSION_SECRET is required");

// Use PostgreSQL as session store so sessions survive server restarts
// and work across multiple instances in the deployed environment.
const PgSession = connectPgSimple(session);

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "sessions",
      createTableIfMissing: true,
    }),
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
