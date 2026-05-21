import crypto from "crypto";
import { env } from "../config/env.js";

export function verifyLemonSignature(rawBody, signature) {
  if (!env.lemonWebhookSecret) return false;
  if (!signature) return false;
  const digest = crypto.createHmac("sha256", env.lemonWebhookSecret).update(rawBody).digest("hex");
  const left = Buffer.from(digest);
  const right = Buffer.from(String(signature));
  if (left.length != right.length) return false;
  return crypto.timingSafeEqual(left, right);
}
