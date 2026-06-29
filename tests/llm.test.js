import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAgentPrompt,
  normalizeStructuredOutput,
  parseJsonFromText,
  structuredAgentOutputSchema
} from "../src/llm.js";
import { COUNCIL_ROLES, createSession } from "../src/domain.js";

const session = createSession({
  question: "Should I leave my job to build an AI product?",
  background: "I have a prototype and limited runway.",
  currentLeaning: "Validate first.",
  timeHorizon: "4 weeks",
  emotionalState: "Anxious",
  constraints: "Need income stability"
}).session;

test("builds role-specific prompt with decision context and output contract", () => {
  const prompt = buildAgentPrompt({
    role: COUNCIL_ROLES.find((role) => role.id === "skeptic"),
    session,
    options: { mode: "challenge", prompt: "Challenge quitting now." }
  });

  assert.match(prompt.system, /Private Council/);
  assert.match(prompt.system, /Skeptic/);
  assert.match(prompt.user, /Challenge quitting now/);
  assert.match(prompt.user, /Should I leave my job/);
});

test("parses plain and fenced JSON model text", () => {
  assert.deepEqual(parseJsonFromText('{"summary":"ok"}'), { summary: "ok" });
  assert.deepEqual(parseJsonFromText('```json\n{"summary":"ok"}\n```'), { summary: "ok" });
});

test("normalizes partial structured outputs into safe canvas shape", () => {
  const output = normalizeStructuredOutput({
    summary: "  Summary  ",
    claims: [{ text: "Claim", stance: "weird", confidence: "high" }],
    assumptions: [{ text: "Assumption", criticality: "high" }],
    risks: [{ text: "Risk", likelihood: "low", impact: "high" }],
    questionsForUser: ["Question"],
    recommendedActions: ["Action"],
    confidence: "unexpected"
  });

  assert.equal(output.summary, "Summary");
  assert.equal(output.claims[0].stance, "neutral");
  assert.equal(output.risks[0].mitigation, "");
  assert.equal(output.confidence, "medium");
});

test("structured output schema requires the MVP agent fields", () => {
  assert.equal(structuredAgentOutputSchema.type, "object");
  assert.ok(structuredAgentOutputSchema.required.includes("summary"));
  assert.ok(structuredAgentOutputSchema.required.includes("claims"));
  assert.ok(structuredAgentOutputSchema.required.includes("risks"));
});
