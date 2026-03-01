import { env } from "../config/env.js";
import { fetchWithRetry, safeReadText } from "../config/http.js";

const API_BASE = env.lemonApiBaseUrl || "https://api.lemonsqueezy.com/v1";

function lemonHeaders() {
  if (!env.lemonApiKey) throw new Error("LEMON_API_KEY is required");
  return {
    Accept: "application/vnd.api+json",
    "Content-Type": "application/vnd.api+json",
    Authorization: `Bearer ${env.lemonApiKey}`
  };
}

export async function createSubscriptionCheckout({ userId, userEmail, planVariantId, tenantId = "default" }) {
  const url = `${API_BASE}/checkouts`;
  const body = {
    data: {
      type: "checkouts",
      attributes: {
        checkout_data: {
          custom: {
            userId,
            tenantId,
            type: "subscription"
          },
          email: userEmail
        }
      },
      relationships: {
        store: { data: { type: "stores", id: String(env.lemonStoreId) } },
        variant: { data: { type: "variants", id: String(planVariantId) } }
      }
    }
  };

  const res = await fetchWithRetry(url, { method: "POST", headers: lemonHeaders(), body: JSON.stringify(body) });
  if (!res.ok) {
    const text = await safeReadText(res);
    throw new Error(`Lemon create subscription checkout failed: ${res.status} ${text.slice(0, 250)}`.trim());
  }
  return res.json();
}

export async function createCreditsCheckout({ userId, userEmail, creditsVariantId, tenantId = "default" }) {
  const url = `${API_BASE}/checkouts`;
  const body = {
    data: {
      type: "checkouts",
      attributes: {
        checkout_data: {
          custom: {
            userId,
            tenantId,
            type: "credits_topup"
          },
          email: userEmail
        }
      },
      relationships: {
        store: { data: { type: "stores", id: String(env.lemonStoreId) } },
        variant: { data: { type: "variants", id: String(creditsVariantId) } }
      }
    }
  };

  const res = await fetchWithRetry(url, { method: "POST", headers: lemonHeaders(), body: JSON.stringify(body) });
  if (!res.ok) {
    const text = await safeReadText(res);
    throw new Error(`Lemon create credits checkout failed: ${res.status} ${text.slice(0, 250)}`.trim());
  }
  return res.json();
}
