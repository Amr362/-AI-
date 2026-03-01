import { env } from "../config/env.js";
import { createShopifyOrder, findShopifyOrder, getProductSnapshot } from "../shopify/client.js";
import { createWooOrder, findWooOrder } from "../woocommerce/client.js";

const callLogs = [];
const orderLogs = [];

export function getMerchant(merchantId) {
  return env.merchants[merchantId] || env.merchants[env.defaultMerchantId] || null;
}

export function logCall(entry) {
  callLogs.push({ id: callLogs.length + 1, at: new Date().toISOString(), ...entry });
  if (callLogs.length > 500) callLogs.shift();
}

export function getDashboardData() {
  return {
    callLogs: [...callLogs].reverse().slice(0, 100),
    orderLogs: [...orderLogs].reverse().slice(0, 100)
  };
}

export async function createOrderForAllChannels(merchantId, payload) {
  const merchant = getMerchant(merchantId);
  if (!merchant) throw new Error("Merchant configuration not found.");

  const productMeta = getProductSnapshot(payload.product) || {};
  const enriched = { ...payload, unitPrice: productMeta.price || payload.unitPrice || 0 };

  const results = { merchantId, shopify: null, wooCommerce: null };

  const [shopifyResult, wooResult] = await Promise.allSettled([
    createShopifyOrder(merchant, enriched),
    createWooOrder(merchant, enriched)
  ]);

  if (shopifyResult.status === "fulfilled") {
    results.shopify = {
      id: shopifyResult.value?.order?.id,
      name: shopifyResult.value?.order?.name,
      financial_status: shopifyResult.value?.order?.financial_status
    };
  } else {
    results.shopify = { error: shopifyResult.reason.message };
  }

  if (wooResult.status === "fulfilled") {
    results.wooCommerce = {
      id: wooResult.value?.id,
      status: wooResult.value?.status,
      number: wooResult.value?.number
    };
  } else {
    results.wooCommerce = { error: wooResult.reason.message };
  }

  orderLogs.push({ at: new Date().toISOString(), payload: enriched, results });
  if (orderLogs.length > 500) orderLogs.shift();

  return results;
}

export async function getOrderStatus(merchantId, { orderNumber, phone }) {
  const merchant = getMerchant(merchantId);
  if (!merchant) throw new Error("Merchant configuration not found.");

  const [shopify, woo] = await Promise.all([
    findShopifyOrder(merchant, { orderNumber, phone }),
    findWooOrder(merchant, { orderNumber, phone })
  ]);

  if (!shopify && !woo) {
    return null;
  }

  return {
    shopify: shopify
      ? { id: shopify.id, name: shopify.name, fulfillment_status: shopify.fulfillment_status, financial_status: shopify.financial_status }
      : null,
    wooCommerce: woo ? { id: woo.id, number: woo.number, status: woo.status } : null
  };
}

export function getProductInfo(productName) {
  const product = getProductSnapshot(productName);
  if (!product) return null;
  return {
    name: product.name,
    price: product.price,
    currency: product.currency || "EGP",
    stock: product.stock,
    shipping: product.shipping || "2-5 days"
  };
}

export function resolveMerchantIdByCalledNumber(called) {
  if (!called) return env.defaultMerchantId;
  return env.merchantPhoneMap[called] || env.defaultMerchantId;
}
