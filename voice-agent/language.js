const ARABIC_COUNTRIES = new Set(["EG", "SA", "AE", "KW", "QA", "BH", "OM", "JO", "LB", "SY", "IQ", "PS", "YE", "SD", "LY", "DZ", "MA", "TN"]);

export function resolveLanguage({ explicitLanguage, speechText, callerCountry, defaultLanguage = "ar" }) {
  if (explicitLanguage === "ar" || explicitLanguage === "en") return explicitLanguage;

  if (speechText && /[\u0600-\u06FF]/.test(speechText)) return "ar";

  const cc = String(callerCountry || "").trim().toUpperCase();
  if (ARABIC_COUNTRIES.has(cc)) return "ar";

  return defaultLanguage === "en" ? "en" : "ar";
}
