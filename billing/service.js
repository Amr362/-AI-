import { getPlan } from "./plans.js";
import {
  addFailedPayment,
  addPayment,
  addUsage,
  getOrCreateUser,
  listFailedPayments,
  listPayments,
  listUsers,
  saveUser,
  getMonthlyUsageSummary
} from "./store.js";
import { sendEmailNotification } from "../notifications/email.js";

export function activateSubscription({ userId, tenantId = "default", userEmail, planCode, lemonSubscriptionId, lemonCustomerId }) {
  const plan = getPlan(planCode);
  if (!plan) throw new Error(`Unknown plan: ${planCode}`);

  const user = getOrCreateUser(userId, tenantId);
  user.planCode = plan.code;
  user.creditsBalance = plan.monthlyCredits;
  user.creditsUsedCurrentMonth = 0;
  user.status = "active";
  user.subscriptionStatus = "active";
  user.lemonSubscriptionId = lemonSubscriptionId || user.lemonSubscriptionId;
  user.lemonCustomerId = lemonCustomerId || user.lemonCustomerId;

  saveUser(user);

  if (userEmail) {
    sendEmailNotification({
      to: userEmail,
      subject: "Subscription activated",
      text: `Your ${plan.name} plan is active with ${plan.monthlyCredits} credits.`
    });
  }

  return user;
}

export function handlePaymentSucceeded({ userId, tenantId = "default", amountUsd, userEmail, reason = "subscription_renewal", creditsToAdd = 0 }) {
  const user = getOrCreateUser(userId, tenantId);
  user.status = "active";
  user.subscriptionStatus = "active";

  if (reason === "subscription_renewal" && user.planCode) {
    const plan = getPlan(user.planCode);
    if (plan) {
      user.creditsBalance += plan.monthlyCredits;
      user.creditsUsedCurrentMonth = 0;
    }
  }

  if (creditsToAdd > 0) {
    user.creditsBalance += creditsToAdd;
  }

  saveUser(user);

  addPayment({ userId, tenantId, amountUsd, reason, creditsAdded: creditsToAdd });

  if (userEmail) {
    sendEmailNotification({
      to: userEmail,
      subject: "Payment received",
      text: `Payment succeeded. Your current credit balance is ${user.creditsBalance}.`
    });
  }

  return user;
}

export function handlePaymentFailed({ userId, tenantId = "default", amountUsd, userEmail, reason = "subscription_charge_failed" }) {
  const user = getOrCreateUser(userId, tenantId);
  user.status = "past_due";
  user.subscriptionStatus = "payment_failed";
  saveUser(user);

  addFailedPayment({ userId, tenantId, amountUsd, reason });

  if (userEmail) {
    sendEmailNotification({
      to: userEmail,
      subject: "Payment failed",
      text: "Your payment failed. Please update your payment method to restore access."
    });
  }

  return user;
}

export function consumeCredit({ userId, tenantId = "default", credits = 1, source = "voice_response" }) {
  const user = getOrCreateUser(userId, tenantId);
  if (user.status !== "active") {
    throw new Error("Subscription is not active");
  }
  if (user.creditsBalance < credits) {
    user.status = "credit_exhausted";
    saveUser(user);
    throw new Error("Insufficient credits");
  }

  user.creditsBalance -= credits;
  user.creditsUsedCurrentMonth += credits;
  saveUser(user);
  addUsage({ userId, tenantId, credits, source });
  return user;
}

export function manualCreditAdjustment({ userId, tenantId = "default", delta, reason = "admin_adjustment" }) {
  const user = getOrCreateUser(userId, tenantId);
  user.creditsBalance = Math.max(0, user.creditsBalance + Number(delta || 0));
  saveUser(user);
  addPayment({ userId, tenantId, amountUsd: 0, reason, creditsAdded: Number(delta || 0) });
  return user;
}

export function getAdminSnapshot({ month, tenantId } = {}) {
  return {
    users: listUsers(),
    payments: listPayments().slice(0, 200),
    failedPayments: listFailedPayments().slice(0, 200),
    usage: getMonthlyUsageSummary({ month, tenantId })
  };
}
