/**
 * Shared serverless handler: loads the Express app once and forwards (req, res).
 * Used by all api/*.ts so the BFF runs on Vercel with LTA_API_KEY server-side only.
 */

let appPromise: Promise<{ app: (req: unknown, res: unknown) => void }> | null = null;

export function getApp(): Promise<{ app: (req: unknown, res: unknown) => void }> {
  if (!appPromise) {
    appPromise = import("../backend/dist/server.js").then((m) => ({ app: m.app }));
  }
  return appPromise;
}
