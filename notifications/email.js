import { env } from "../config/env.js";

export async function sendEmailNotification({ to, subject, text }) {
  if (!env.smtpFromEmail) {
    console.log("[EMAIL:SKIPPED]", { to, subject, text });
    return { sent: false, reason: "SMTP not configured" };
  }

  // Placeholder transport for low-resource environments.
  // Integrate with SES/Sendgrid/Postmark in production.
  console.log("[EMAIL]", { from: env.smtpFromEmail, to, subject, text });
  return { sent: true };
}
