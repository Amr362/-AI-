import Redis from "ioredis";
import { env } from "../config/env.js";

class MemoryStore {
  constructor() {
    this.data = new Map();
  }

  async get(key) {
    return this.data.get(key) || null;
  }

  async set(key, value) {
    this.data.set(key, value);
  }
}

let store;
if (env.redisUrl) {
  const redis = new Redis(env.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
  store = {
    async get(key) {
      const raw = await redis.get(key);
      return raw ? JSON.parse(raw) : null;
    },
    async set(key, value) {
      await redis.set(key, JSON.stringify(value), "EX", env.sessionTtlSeconds);
    }
  };
  redis.connect().catch(() => {
    console.warn("[WARN] Redis unavailable, using in-memory sessions.");
    store = new MemoryStore();
  });
} else {
  store = new MemoryStore();
}

export async function getSession(callSid) {
  const current = await store.get(callSid);
  return current || {
    language: "ar",
    lastIntent: null,
    stage: "start",
    orderDraft: {},
    merchantId: env.defaultMerchantId
  };
}

export async function saveSession(callSid, session) {
  await store.set(callSid, session);
}
