import test from "node:test";
import assert from "node:assert/strict";
import { activateSubscription, consumeCredit, handlePaymentFailed, handlePaymentSucceeded, manualCreditAdjustment } from "../billing/service.js";

const tenantId = `t-${Date.now()}`;

test("activate subscription grants monthly credits", () => {
  const user = activateSubscription({ userId: "u1", tenantId, userEmail: "u1@example.com", planCode: "starter" });
  assert.equal(user.status, "active");
  assert.equal(user.creditsBalance, 10000);
});

test("consume credit decrements balance", () => {
  const user = consumeCredit({ userId: "u1", tenantId, credits: 1, source: "voice_response" });
  assert.equal(user.creditsBalance, 9999);
});

test("payment succeeded top-up adds credits", () => {
  const user = handlePaymentSucceeded({ userId: "u1", tenantId, amountUsd: 20, reason: "credits_topup", creditsToAdd: 5000 });
  assert.equal(user.creditsBalance, 14999);
});

test("payment failed marks user as past_due", () => {
  const user = handlePaymentFailed({ userId: "u1", tenantId, amountUsd: 49 });
  assert.equal(user.status, "past_due");
});

test("manual adjust supports remove/add credits", () => {
  const restored = handlePaymentSucceeded({ userId: "u1", tenantId, amountUsd: 49, reason: "subscription_renewal" });
  assert.equal(restored.status, "active");

  const down = manualCreditAdjustment({ userId: "u1", tenantId, delta: -1000 });
  const downBalance = down.creditsBalance;
  const up = manualCreditAdjustment({ userId: "u1", tenantId, delta: 250 });
  assert.ok(downBalance >= 0);
  assert.equal(up.creditsBalance, downBalance + 250);
});
