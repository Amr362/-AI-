import twilio from "twilio";
import { env } from "../config/env.js";

const { VoiceResponse } = twilio.twiml;

function getVoice(language) {
  return language === "ar" ? env.twilioVoiceArabic : env.twilioVoiceEnglish;
}

export function gatherResponse({ message, language = "ar", action = "/twilio/voice/handle" }) {
  const twiml = new VoiceResponse();
  const gather = twiml.gather({
    input: "speech",
    speechTimeout: "auto",
    action,
    method: "POST",
    language: language === "ar" ? "ar-EG" : "en-US",
    hints: language === "ar" ? "طلب جديد, متابعة طلب, سعر المنتج, شحن" : "new order, order status, product price, shipping"
  });

  gather.say({ voice: getVoice(language), language: language === "ar" ? "ar-SA" : "en-US" }, message);
  return twiml.toString();
}

export function sayAndHangup({ message, language = "ar" }) {
  const twiml = new VoiceResponse();
  twiml.say({ voice: getVoice(language), language: language === "ar" ? "ar-SA" : "en-US" }, message);
  twiml.hangup();
  return twiml.toString();
}
