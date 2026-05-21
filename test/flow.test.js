import test from "node:test";
import assert from "node:assert/strict";
import { createVoiceFlow } from "../voice-agent/flow.js";

function baseSession() {
  return { language: "ar", lastIntent: null, stage: "start", orderDraft: {}, merchantId: "demo" };
}

test("new_order asks for missing fields", async () => {
  const flow = createVoiceFlow({
    reasonIntent: async () => ({ intent: "new_order", language: "ar", extracted: { product: "Headphones" }, userReply: "" })
  });

  const out = await flow({ speechText: "عايز اطلب", session: baseSession(), callSid: "CA1", from: "+201" });
  assert.match(out.reply, /الكمية/);
  assert.equal(out.session.stage, "collect_quantity");
});

test("new_order confirms and creates", async () => {
  let created = false;
  const flow = createVoiceFlow({
    reasonIntent: async () => ({
      intent: "new_order",
      language: "en",
      extracted: { product: "Headphones", quantity: 1, address: "Cairo", phone: "+201", customerName: "Ali" },
      userReply: ""
    }),
    createOrderForAllChannels: async () => {
      created = true;
      return { shopify: { name: "#1001" }, wooCommerce: { number: "2001" } };
    }
  });

  const s = baseSession();
  s.stage = "confirm_order";
  const out = await flow({ speechText: "yes confirm", session: s, callSid: "CA2", from: "+201" });
  assert.equal(created, true);
  assert.equal(out.hangup, true);
  assert.match(out.reply, /#1001/);
});
