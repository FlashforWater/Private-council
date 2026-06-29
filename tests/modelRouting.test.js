import test from "node:test";
import assert from "node:assert/strict";
import { envKeyForRole, roleRouteFromEnv } from "../src/modelRouting.js";

test("role route uses role-specific provider and model overrides", () => {
  const route = roleRouteFromEnv("skeptic", {
    COUNCIL_PROVIDER: "openai",
    COUNCIL_MODEL: "gpt-default",
    COUNCIL_PROVIDER_SKEPTIC: "anthropic",
    COUNCIL_MODEL_SKEPTIC: "claude-risk"
  });

  assert.equal(route.provider, "anthropic");
  assert.equal(route.model, "claude-risk");
  assert.equal(route.selectionReason, "risk_red_team");
});

test("role route falls back to global route", () => {
  const route = roleRouteFromEnv("operator", {
    COUNCIL_PROVIDER: "gemini",
    COUNCIL_MODEL: "gemini-planner"
  });

  assert.equal(route.provider, "gemini");
  assert.equal(route.model, "gemini-planner");
  assert.equal(envKeyForRole("COUNCIL_MODEL", "user_advocate"), "COUNCIL_MODEL_USER_ADVOCATE");
});
