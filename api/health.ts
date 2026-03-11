import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getApp } from "../lib/vercel-handler.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const { app } = await getApp();
  app(req, res);
}
