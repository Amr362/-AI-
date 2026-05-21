import OpenAI from "openai";
import { env } from "../config/env.js";
import { SYSTEM_PROMPT } from "../voice-agent/prompts.js";

const client = new OpenAI({ apiKey: env.openAiApiKey });

export async function reasonIntent({ transcript, state }) {
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      intent: { type: "string", enum: ["new_order", "order_status", "product_question", "other"] },
      language: { type: "string", enum: ["ar", "en"] },
      extracted: {
        type: "object",
        additionalProperties: false,
        properties: {
          product: { type: "string" },
          quantity: { type: "integer" },
          address: { type: "string" },
          phone: { type: "string" },
          customerName: { type: "string" },
          orderNumber: { type: "string" }
        }
      },
      userReply: { type: "string" }
    },
    required: ["intent", "language", "extracted", "userReply"]
  };

  const response = await client.responses.create({
    model: env.openAiModel,
    input: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Current state: ${JSON.stringify(state)}\nUser said: ${transcript}\nReturn JSON only.`
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "voice_agent_reasoning",
        schema,
        strict: true
      }
    },
    temperature: 0.2,
    max_output_tokens: 220
  });

  const content = response.output_text || "{}";
  return JSON.parse(content);
}
