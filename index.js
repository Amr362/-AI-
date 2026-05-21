import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { env } from "./config/env.js";
import twilioRouter from "./twilio/router.js";
import dashboardRouter from "./dashboard/router.js";
import billingRouter from "./billing/router.js";
import webhooksRouter from "./webhooks/router.js";

const app = express();

const rawBodySaver = (req, res, buf) => {
  if (buf?.length) req.rawBody = buf.toString("utf8");
};

app.use(express.urlencoded({ extended: false, verify: rawBodySaver }));
app.use(express.json({ verify: rawBodySaver }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/public", express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.json({
    service: "Voice AI Agent",
    version: "1.0.0",
    endpoints: [
      "/health",
      "/twilio/voice/incoming",
      "/twilio/voice/handle",
      "/billing/plans",
      "/billing/admin",
      "/webhooks/subscription_created",
      "/webhooks/payment_succeeded",
      "/webhooks/payment_failed",
      "/public/billing-dashboard.html"
    ]
  });
});

app.use("/twilio", twilioRouter);
app.use("/", dashboardRouter);
app.use("/billing", billingRouter);
app.use("/webhooks", webhooksRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error", details: err.message });
});

app.listen(env.port, () => {
  console.log(`Voice AI Agent listening on :${env.port}`);
});
