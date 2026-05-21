import express from "express";
import { createCreditsCheckout, createSubscriptionCheckout } from "./lemonClient.js";
import { consumeCredit, getAdminSnapshot, getOrCreateUser, manualCreditAdjustment } from "./serviceFacade.js";
import { getPlan } from "./plans.js";
import { env } from "../config/env.js";

const router = express.Router();

router.get("/plans", (req, res) => {
  res.json({ plans: Object.values({
    starter: getPlan("starter"),
    professional: getPlan("professional"),
    enterprise: getPlan("enterprise")
  }) });
});

router.post("/checkout/subscription", async (req, res, next) => {
  try {
    const { userId, userEmail, planCode, tenantId = "default" } = req.body || {};
    if (!userId || !planCode) return res.status(400).json({ error: "userId and planCode are required" });

    const variantId = env.lemonPlanVariantMap[planCode];
    if (!variantId) return res.status(400).json({ error: `Variant not configured for plan ${planCode}` });

    const payload = await createSubscriptionCheckout({ userId, userEmail, planVariantId: variantId, tenantId });
    return res.json(payload);
  } catch (error) {
    return next(error);
  }
});

router.post("/checkout/credits", async (req, res, next) => {
  try {
    const { userId, userEmail, tenantId = "default" } = req.body || {};
    if (!userId) return res.status(400).json({ error: "userId is required" });
    if (!env.lemonCreditsVariantId) return res.status(400).json({ error: "LEMON_CREDITS_VARIANT_ID not configured" });

    const payload = await createCreditsCheckout({ userId, userEmail, creditsVariantId: env.lemonCreditsVariantId, tenantId });
    return res.json(payload);
  } catch (error) {
    return next(error);
  }
});

router.get("/users/:userId/balance", (req, res) => {
  const user = getOrCreateUser(req.params.userId, req.query.tenantId || "default");
  res.json({
    userId: user.userId,
    tenantId: user.tenantId,
    status: user.status,
    planCode: user.planCode,
    creditsBalance: user.creditsBalance,
    creditsUsedCurrentMonth: user.creditsUsedCurrentMonth
  });
});

router.post("/usage/consume", (req, res, next) => {
  try {
    const { userId, tenantId = "default", source = "voice_response", credits = 1 } = req.body || {};
    if (!userId) return res.status(400).json({ error: "userId is required" });
    const user = consumeCredit({ userId, tenantId, source, credits: Number(credits || 1) });
    return res.json({ ok: true, creditsBalance: user.creditsBalance, status: user.status });
  } catch (error) {
    return next(error);
  }
});

router.get("/admin", (req, res) => {
  const snapshot = getAdminSnapshot({ month: req.query.month, tenantId: req.query.tenantId });
  res.json(snapshot);
});

router.post("/admin/credits/adjust", (req, res, next) => {
  try {
    const { userId, tenantId = "default", delta, reason } = req.body || {};
    if (!userId || Number.isNaN(Number(delta))) return res.status(400).json({ error: "userId and numeric delta are required" });
    const user = manualCreditAdjustment({ userId, tenantId, delta: Number(delta), reason });
    res.json({ ok: true, user });
  } catch (error) {
    next(error);
  }
});

export default router;
