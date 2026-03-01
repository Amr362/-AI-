import express from "express";
import { verifyLemonSignature } from "./verifier.js";
import { activateSubscription, handlePaymentFailed, handlePaymentSucceeded } from "../billing/service.js";

const router = express.Router();

function parseBody(req) {
  return typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
}

function assertSignature(req, res) {
  const signature = req.headers["x-signature"] || req.headers["x-lemonsqueezy-signature"];
  const raw = req.rawBody || JSON.stringify(req.body || {});
  const ok = verifyLemonSignature(raw, signature);
  if (!ok) {
    res.status(401).json({ error: "Invalid Lemon webhook signature" });
    return false;
  }
  return true;
}

router.post("/subscription_created", (req, res, next) => {
  try {
    if (!assertSignature(req, res)) return;
    const event = parseBody(req);
    const attrs = event?.data?.attributes || {};
    const meta = attrs.custom_data || attrs.meta || {};

    const user = activateSubscription({
      userId: String(meta.userId || attrs.user_id || attrs.user_email),
      tenantId: String(meta.tenantId || "default"),
      userEmail: attrs.user_email,
      planCode: String(meta.planCode || "starter"),
      lemonSubscriptionId: String(event?.data?.id || ""),
      lemonCustomerId: String(attrs.customer_id || "")
    });

    return res.json({ ok: true, user });
  } catch (error) {
    return next(error);
  }
});

router.post("/payment_succeeded", (req, res, next) => {
  try {
    if (!assertSignature(req, res)) return;
    const event = parseBody(req);
    const attrs = event?.data?.attributes || {};
    const meta = attrs.custom_data || attrs.meta || {};

    const type = String(meta.type || "subscription_renewal");
    const creditsToAdd = type === "credits_topup" ? Number(meta.creditsToAdd || 0) : 0;

    const user = handlePaymentSucceeded({
      userId: String(meta.userId || attrs.user_email),
      tenantId: String(meta.tenantId || "default"),
      amountUsd: Number(attrs.total_usd || attrs.total || 0),
      userEmail: attrs.user_email,
      reason: type,
      creditsToAdd
    });

    return res.json({ ok: true, user });
  } catch (error) {
    return next(error);
  }
});

router.post("/payment_failed", (req, res, next) => {
  try {
    if (!assertSignature(req, res)) return;
    const event = parseBody(req);
    const attrs = event?.data?.attributes || {};
    const meta = attrs.custom_data || attrs.meta || {};

    const user = handlePaymentFailed({
      userId: String(meta.userId || attrs.user_email),
      tenantId: String(meta.tenantId || "default"),
      amountUsd: Number(attrs.total_usd || attrs.total || 0),
      userEmail: attrs.user_email,
      reason: String(meta.reason || "subscription_charge_failed")
    });

    return res.json({ ok: true, user });
  } catch (error) {
    return next(error);
  }
});

export default router;
