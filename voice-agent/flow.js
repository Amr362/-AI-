import { reasonIntent } from "../llm/openaiClient.js";
import { createOrderForAllChannels, getOrderStatus, getProductInfo, logCall } from "../orders/service.js";

const ORDER_FIELDS = ["product", "quantity", "address", "phone", "customerName"];

function nextMissingField(orderDraft) {
  return ORDER_FIELDS.find((field) => !orderDraft[field]);
}

function askForField(field, lang = "ar") {
  const ar = {
    product: "أكيد. تحب تطلب أي منتج؟",
    quantity: "تمام. الكمية المطلوبة كام؟",
    address: "ممتاز. من فضلك اذكر العنوان بالتفصيل.",
    phone: "رقم الهاتف اللي هنأكد عليه الطلب؟",
    customerName: "واسم حضرتك بالكامل؟"
  };
  const en = {
    product: "Sure. Which product would you like to order?",
    quantity: "Great. What quantity do you need?",
    address: "Perfect. Please provide your full delivery address.",
    phone: "What phone number should we use to confirm the order?",
    customerName: "And may I have your full name?"
  };
  return (lang === "ar" ? ar : en)[field];
}

function createConfirmation(draft, lang) {
  if (lang === "ar") {
    return `تأكيد الطلب: ${draft.product}، الكمية ${draft.quantity}، العنوان ${draft.address}، الهاتف ${draft.phone}، الاسم ${draft.customerName}. هل أؤكد التنفيذ الآن؟`;
  }
  return `Order confirmation: ${draft.product}, quantity ${draft.quantity}, address ${draft.address}, phone ${draft.phone}, name ${draft.customerName}. Should I place it now?`;
}

function isConfirmed(speechText) {
  return /(yes|confirm|ok|sure|ايوه|أيوه|نعم|أكد|موافق|تمام)/i.test(String(speechText || ""));
}

export function createVoiceFlow(deps = {}) {
  const reasoningFn = deps.reasonIntent || reasonIntent;
  const createOrderFn = deps.createOrderForAllChannels || createOrderForAllChannels;
  const getStatusFn = deps.getOrderStatus || getOrderStatus;
  const getProductInfoFn = deps.getProductInfo || getProductInfo;
  const logCallFn = deps.logCall || logCall;

  return async function processUtterance({ speechText, session, callSid, from }) {
    const reasoning = await reasoningFn({ transcript: speechText, state: session });
    session.language = reasoning.language || session.language || "ar";

    if (reasoning.extracted) {
      session.orderDraft = { ...session.orderDraft, ...reasoning.extracted };
    }

    const intent = reasoning.intent === "other" && session.lastIntent ? session.lastIntent : reasoning.intent;
    session.lastIntent = intent;

    if (intent === "new_order") {
      const missing = nextMissingField(session.orderDraft);
      if (missing) {
        session.stage = `collect_${missing}`;
        return { session, reply: askForField(missing, session.language) };
      }

      if (session.stage !== "confirm_order") {
        session.stage = "confirm_order";
        return { session, reply: createConfirmation(session.orderDraft, session.language) };
      }

      if (!isConfirmed(speechText)) {
        session.stage = "collect_product";
        return {
          session,
          reply: session.language === "ar" ? "تمام، قلّي التعديل اللي تحب تعمله على الطلب." : "Got it. Tell me what you want to update in the order."
        };
      }

      const results = await createOrderFn(session.merchantId, session.orderDraft);
      session.stage = "completed";
      logCallFn({ callSid, from, intent, action: "create_order", results });

      const msg = session.language === "ar"
        ? `تم إنشاء طلبك. مرجع شوبيفاي: ${results.shopify?.name || "غير متاح"}. ومرجع ووكومرس: ${results.wooCommerce?.number || "غير متاح"}.`
        : `Your order has been created. Shopify ref: ${results.shopify?.name || "N/A"}. WooCommerce ref: ${results.wooCommerce?.number || "N/A"}.`;

      return { session, reply: msg, hangup: true };
    }

    if (intent === "order_status") {
      const lookup = {
        orderNumber: session.orderDraft.orderNumber || reasoning.extracted?.orderNumber,
        phone: session.orderDraft.phone || reasoning.extracted?.phone || from
      };

      if (!lookup.orderNumber && !lookup.phone) {
        return {
          session,
          reply: session.language === "ar" ? "من فضلك اذكر رقم الطلب أو رقم الهاتف." : "Please share your order number or phone number."
        };
      }

      const status = await getStatusFn(session.merchantId, lookup);
      logCallFn({ callSid, from, intent, action: "status_lookup", lookup, statusFound: Boolean(status) });

      if (!status) {
        return {
          session,
          reply: session.language === "ar" ? "للأسف لم أجد طلبًا بهذه البيانات. ممكن رقم بديل؟" : "I couldn't find an order with that info. Could you provide another number?"
        };
      }

      const reply = session.language === "ar"
        ? `حالة الطلب: شوبيفاي ${status.shopify?.financial_status || "غير متاح"}، والتوصيل ${status.shopify?.fulfillment_status || "قيد التجهيز"}. ووكومرس ${status.wooCommerce?.status || "غير متاح"}.`
        : `Order status: Shopify payment is ${status.shopify?.financial_status || "N/A"}, fulfillment is ${status.shopify?.fulfillment_status || "processing"}, and WooCommerce is ${status.wooCommerce?.status || "N/A"}.`;

      return { session, reply, hangup: true };
    }

    if (intent === "product_question") {
      const productName = reasoning.extracted?.product || speechText;
      const info = getProductInfoFn(productName);
      if (!info) {
        return {
          session,
          reply: session.language === "ar" ? "ممكن اسم المنتج بالضبط؟" : "Could you tell me the exact product name?"
        };
      }

      const reply = session.language === "ar"
        ? `${info.name} سعره ${info.price} ${info.currency}، المتاح ${info.stock} قطعة، والشحن ${info.shipping}. تحب أعمله طلب الآن؟`
        : `${info.name} costs ${info.price} ${info.currency}, ${info.stock} units available, shipping in ${info.shipping}. Want me to place it now?`;

      logCallFn({ callSid, from, intent, action: "product_answer", product: info.name });
      return { session, reply };
    }

    return {
      session,
      reply: reasoning.userReply || (session.language === "ar" ? "اتفضل، كيف أقدر أساعدك؟" : "How can I help you today?")
    };
  };
}

export const processUtterance = createVoiceFlow();
