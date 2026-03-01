import { fetchWithRetry, safeReadText } from "../config/http.js";
export async function createWooOrder(merchantConfig, payload) {
  const woo = merchantConfig?.woocommerce;
  if (!woo?.baseUrl || !woo?.consumerKey || !woo?.consumerSecret) {
    throw new Error("WooCommerce is not configured for this merchant.");
  }

  const auth = Buffer.from(`${woo.consumerKey}:${woo.consumerSecret}`).toString("base64");
  const url = `${woo.baseUrl.replace(/\/$/, "")}/wp-json/wc/v3/orders`;

  const res = await fetchWithRetry(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      payment_method: "cod",
      payment_method_title: "Cash on Delivery",
      set_paid: false,
      billing: {
        first_name: payload.customerName || "Phone",
        address_1: payload.address,
        phone: payload.phone
      },
      shipping: {
        first_name: payload.customerName || "Phone",
        address_1: payload.address
      },
      line_items: [{ name: payload.product, quantity: payload.quantity }],
      customer_note: "Created by voice AI agent"
    })
  });

  if (!res.ok) {
    const body = await safeReadText(res);
    throw new Error(`WooCommerce create order failed: ${res.status} ${body.slice(0, 250)}`.trim());
  }
  return res.json();
}

export async function findWooOrder(merchantConfig, { orderNumber, phone }) {
  const woo = merchantConfig?.woocommerce;
  if (!woo?.baseUrl || !woo?.consumerKey || !woo?.consumerSecret) return null;

  const auth = Buffer.from(`${woo.consumerKey}:${woo.consumerSecret}`).toString("base64");
  const params = new URLSearchParams();
  params.set("per_page", "10");
  if (orderNumber) params.set("search", orderNumber);
  const url = `${woo.baseUrl.replace(/\/$/, "")}/wp-json/wc/v3/orders?${params}`;

  const res = await fetchWithRetry(url, { headers: { Authorization: `Basic ${auth}` } });
  if (!res.ok) return null;
  const orders = await res.json();
  if (!Array.isArray(orders)) return null;

  if (phone) {
    return orders.find((o) => o?.billing?.phone === phone) || orders[0] || null;
  }
  return orders[0] || null;
}
