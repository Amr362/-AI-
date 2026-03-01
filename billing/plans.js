export const PLANS = {
  starter: {
    code: "starter",
    name: "Starter",
    monthlyPriceUsd: 49,
    monthlyCredits: 10_000
  },
  professional: {
    code: "professional",
    name: "Professional",
    monthlyPriceUsd: 129,
    monthlyCredits: 50_000
  },
  enterprise: {
    code: "enterprise",
    name: "Enterprise",
    monthlyPriceUsd: 399,
    monthlyCredits: 200_000
  }
};

export function getPlan(planCode) {
  return PLANS[String(planCode || "").toLowerCase()] || null;
}
