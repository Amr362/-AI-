import dotenv from "dotenv";

dotenv.config();

const toBool = (value, fallback = false) => {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

const parseJson = (value, fallback) => {
  try {
    if (!value) return fallback;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const env = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || "development",
  publicBaseUrl: process.env.PUBLIC_BASE_URL || "http://localhost:3000",
  openAiApiKey: process.env.OPENAI_API_KEY || "",
  openAiModel: process.env.OPENAI_MODEL || "gpt-4o-mini",
  defaultLanguage: process.env.DEFAULT_LANGUAGE || "ar-EG",
  twilioVoiceArabic: process.env.TWILIO_DEFAULT_VOICE || "Polly.Zeina",
  twilioVoiceEnglish: process.env.TWILIO_ENGLISH_VOICE || "Polly.Joanna",
  validateTwilioSignature: toBool(process.env.ENABLE_TWILIO_SIGNATURE_VALIDATION, false),
  redisUrl: process.env.REDIS_URL || "",
  sessionTtlSeconds: Number(process.env.SESSION_TTL_SECONDS || 900),
  merchants: parseJson(process.env.MERCHANTS_JSON, {}),
  defaultMerchantId: process.env.DEFAULT_MERCHANT_ID || "demo",
  productCatalog: parseJson(process.env.PRODUCT_CATALOG_JSON, []),
  merchantPhoneMap: parseJson(process.env.MERCHANT_PHONE_MAP_JSON, {}),

  lemonApiKey: process.env.LEMON_API_KEY || "",
  lemonWebhookSecret: process.env.LEMON_WEBHOOK_SECRET || "",
  lemonStoreId: process.env.LEMON_STORE_ID || "",
  lemonApiBaseUrl: process.env.LEMON_API_BASE_URL || "https://api.lemonsqueezy.com/v1",
  lemonCreditsVariantId: process.env.LEMON_CREDITS_VARIANT_ID || "",
  lemonPlanVariantMap: parseJson(process.env.LEMON_PLAN_VARIANT_MAP_JSON, {}),

  smtpFromEmail: process.env.SMTP_FROM_EMAIL || "",
};

if (!env.openAiApiKey) {
  console.warn("[WARN] OPENAI_API_KEY is not set. LLM responses will fail.");
}
