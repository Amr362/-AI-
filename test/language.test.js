import test from "node:test";
import assert from "node:assert/strict";
import { resolveLanguage } from "../voice-agent/language.js";

test("resolveLanguage picks Arabic for Arabic unicode", () => {
  assert.equal(resolveLanguage({ speechText: "عايز أعمل طلب" }), "ar");
});

test("resolveLanguage picks Arabic country", () => {
  assert.equal(resolveLanguage({ callerCountry: "EG", defaultLanguage: "en" }), "ar");
});

test("resolveLanguage falls back to default", () => {
  assert.equal(resolveLanguage({ callerCountry: "US", defaultLanguage: "en" }), "en");
});
