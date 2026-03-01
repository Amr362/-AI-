import express from "express";
import { getDashboardData } from "../orders/service.js";

const router = express.Router();

router.get("/health", (req, res) => {
  res.json({ ok: true, service: "voice-ai-agent", now: new Date().toISOString() });
});

router.get("/dashboard", (req, res) => {
  res.json(getDashboardData());
});

export default router;
