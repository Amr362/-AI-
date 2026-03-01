import express from "express";
import twilio from "twilio";
import { env } from "../config/env.js";
import { getSession, saveSession } from "../voice-agent/sessionStore.js";
import { processUtterance } from "../voice-agent/flow.js";
import { ARABIC_SALES_GREETING, ENGLISH_GREETING } from "../voice-agent/prompts.js";
import { gatherResponse, sayAndHangup } from "./twiml.js";
import { normalizeSpeech } from "./speech.js";
import { resolveLanguage } from "../voice-agent/language.js";
import { resolveMerchantIdByCalledNumber } from "../orders/service.js";

const router = express.Router();

const validateTwilio = (req, res, next) => {
  if (!env.validateTwilioSignature) return next();

  const signature = req.headers["x-twilio-signature"];
  const url = `${env.publicBaseUrl}${req.originalUrl}`;
  const valid = twilio.validateRequest(process.env.TWILIO_AUTH_TOKEN, signature, url, req.body);

  if (!valid) return res.status(403).send("Invalid Twilio signature");
  return next();
};

router.post("/voice/incoming", validateTwilio, async (req, res) => {
  const callSid = req.body.CallSid;
  if (!callSid) return res.status(400).send("Missing CallSid");

  const session = await getSession(callSid);
  session.merchantId = resolveMerchantIdByCalledNumber(req.body.To);
  session.language = resolveLanguage({
    callerCountry: req.body.CallerCountry,
    defaultLanguage: env.defaultLanguage.startsWith("en") ? "en" : "ar"
  });

  await saveSession(callSid, session);

  const message = session.language === "ar" ? ARABIC_SALES_GREETING : ENGLISH_GREETING;

  return res.type("text/xml").send(
    gatherResponse({
      message,
      language: session.language,
      action: "/twilio/voice/handle"
    })
  );
});

router.post("/voice/handle", validateTwilio, async (req, res) => {
  const { speech, callSid, from } = normalizeSpeech(req.body);
  if (!callSid) return res.status(400).send("Missing CallSid");

  const session = await getSession(callSid);

  if (!speech) {
    return res.type("text/xml").send(
      gatherResponse({
        message: session.language === "ar" ? "ممكن تعيد كلامك بصوت أوضح؟" : "Could you repeat that more clearly?",
        language: session.language,
        action: "/twilio/voice/handle"
      })
    );
  }

  try {
    const result = await processUtterance({ speechText: speech, session, callSid, from });
    result.session.language = resolveLanguage({
      explicitLanguage: result.session.language,
      speechText: speech,
      callerCountry: req.body.CallerCountry,
      defaultLanguage: env.defaultLanguage.startsWith("en") ? "en" : "ar"
    });
    await saveSession(callSid, result.session);

    if (result.hangup) {
      return res.type("text/xml").send(sayAndHangup({ message: result.reply, language: result.session.language }));
    }

    return res.type("text/xml").send(
      gatherResponse({
        message: result.reply,
        language: result.session.language,
        action: "/twilio/voice/handle"
      })
    );
  } catch (error) {
    console.error("Voice handle error", { callSid, error: error.message });
    const fallback = session.language === "ar"
      ? "حصل خطأ بسيط في النظام. ممكن نحاول مرة تانية خلال دقيقة؟"
      : "A temporary system issue occurred. Please try again in a moment.";
    return res.type("text/xml").send(sayAndHangup({ message: fallback, language: session.language }));
  }
});


router.get("/voice/outbound/twiml", async (req, res) => {
  const lang = req.query.lang === "en" ? "en" : "ar";
  const msg = lang === "ar"
    ? "مرحباً، معك المساعد الذكي للطلبات. تقدر تسأل عن منتج أو تتابع طلبك الآن."
    : "Hello, this is the smart order assistant. You can ask about a product or track your order now.";
  return res.type("text/xml").send(gatherResponse({ message: msg, language: lang, action: "/twilio/voice/handle" }));
});

router.post("/voice/outbound/call", async (req, res) => {
  const { to, merchantId, lang } = req.body || {};
  if (!to) return res.status(400).json({ error: "Missing `to` phone number" });
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    return res.status(400).json({ error: "Missing Twilio outbound credentials/env" });
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const query = new URLSearchParams();
  if (lang) query.set("lang", lang);
  if (merchantId) query.set("merchantId", merchantId);
  const twimlUrl = `${env.publicBaseUrl}/twilio/voice/outbound/twiml${query.toString() ? `?${query.toString()}` : ""}`;

  const call = await client.calls.create({
    to,
    from: process.env.TWILIO_PHONE_NUMBER,
    url: twimlUrl,
    method: "GET"
  });

  return res.json({ sid: call.sid, status: call.status, to, twimlUrl });
});

export default router;
