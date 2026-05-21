import { env } from "../config/env.js";
import { fetchWithRetry, safeReadText } from "../config/http.js";

const headers = (token) => ({
  "X-Shopify-Access-Token": token,
  "Content-Type": "application/json"
});

export async function createShopifyOrder(merchantConfig, payload) {
  const shopify = merchantConfig?.shopify;
  if (!shopify?.storeDomain || !shopify?.accessToken) {
    throw new Error("Shopify is not configured for this merchant.");
  }

  const url = `https://${shopify.storeDomain}/admin/api/${shopify.apiVersion || "2024-10"}/orders.json`;
  const lineItems = [{ title: payload.product, quantity: payload.quantity, price: String(payload.unitPrice || 0) }];

  const res = await fetchWithRetry(url, {
    method: "POST",
    headers: headers(shopify.accessToken),
    body: JSON.stringify({
      order: {
        line_items: lineItems,
        financial_status: "pending",
        customer: { first_name: payload.customerName || "Phone", phone: payload.phone },
        shipping_address: { address1: payload.address, phone: payload.phone },
        note: "Created by voice AI agent"
      }
    })
  });

  if (!res.ok) {
    const body = await safeReadText(res);
    throw new Error(`Shopify create order failed: ${res.status} ${body.slice(0, 250)}`.trim());
  }
  return res.json();
}

export async function findShopifyOrder(merchantConfig, { orderNumber, phone }) {
  const shopify = merchantConfig?.shopify;
  if (!shopify?.storeDomain || !shopify?.accessToken) return null;
  const query = orderNumber ? `name:${orderNumber}` : `phone:${phone}`;
  const url = `https://${shopify.storeDomain}/admin/api/${shopify.apiVersion || "2024-10"}/orders.json?status=any&limit=1&query=${encodeURIComponent(query)}`;

  const res = await fetchWithRetry(url, { headers: headers(shopify.accessToken) });
  if (!res.ok) return null;
  const data = await res.json();
  return data.orders?.[0] || null;
}

export function getProductSnapshot(productName) {
  const match = env.productCatalog.find((p) => p.name.toLowerCase().includes(productName.toLowerCase()));
  return match || null;
}
