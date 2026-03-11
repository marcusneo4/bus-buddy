import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import dashboardRouter from "./routes/dashboard.js";

const app = express();
app.disable("x-powered-by");

app.use(
  helmet({
    hsts: env.NODE_ENV === "production",
  })
);

app.use(
  cors({
    origin:
      env.NODE_ENV === "production"
        ? false
        : ["http://localhost:5173", "http://localhost:4173"],
    credentials: false,
    methods: ["GET", "HEAD", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    maxAge: 600,
  })
);
app.use(express.json({ limit: "100kb", strict: true, type: "application/json" }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

// Health / readiness (also under /api/health for Vercel rewrite)
const healthHandler = (_req: express.Request, res: express.Response) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
};
app.get("/health", healthHandler);
app.get("/api/health", healthHandler);

// API routes
app.use("/api", dashboardRouter);

// 404 catch-all
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Error handler (e.g. unhandled rejections from async routes)
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("[server] unhandled error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
);

/** Only start HTTP server when not running as a Vercel serverless function. */
let server: ReturnType<express.Express["listen"]> | null = null;
if (typeof process.env.VERCEL === "undefined" || process.env.VERCEL !== "1") {
  server = app.listen(env.PORT, () => {
    console.log(`[server] Bus Aunty BFF running on http://localhost:${env.PORT}`);
  });
}

export { app, server };
