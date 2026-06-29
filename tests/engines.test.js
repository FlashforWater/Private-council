import test from "node:test";
import assert from "node:assert/strict";
import { aggregateClaims } from "../src/claimAggregator.js";
import { evaluateCrossValidationTrigger } from "../src/crossValidation.js";
import { createSession } from "../src/domain.js";
import { evaluateOptions } from "../src/evaluationEngine.js";
import { classifyMemorySensitivity, proposeMemoryItems } from "../src/privacyGovernance.js";
import { routeProtocol } from "../src/protocolRouter.js";
import { buildReliabilityProfile, ensurePredictionRecords, scorePredictions } from "../src/reliabilityEngine.js";
import { allocateTurns } from "../src/turnAllocator.js";

const input = {
  question: "I am torn between keeping my stable job and starting my AI product",
  background: "There is a value conflict between stability and freedom.",
  currentLeaning: "Start with validation.",
  timeHorizon: "4 weeks",
  emotionalState: "Anxious but focused",
  constraints: "Need income stability"
};

test("protocol router identifies value conflict decisions", () => {
  const route = routeProtocol(input);
  assert.equal(route.decisionType, "conflict");
  assert.equal(route.protocol, "values_negotiation");
  assert.ok(route.councilComposition.includes("user_advocate"));
});

test("turn allocator adds roles for uncertainty and cross-validation", () => {
  const session = createSession({ ...input, question: "I am uncertain and need more information" }).session;
  const allocation = allocateTurns(session, "evaluation", {
    protocolRoute: { decisionType: "uncertainty" },
    crossValidationTrigger: { shouldValidate: true }
  });

  assert.ok(allocation.roleIds.includes("researcher"));
  assert.ok(allocation.roleIds.includes("skeptic"));
  assert.ok(allocation.reasons.length > 0);
});

test("cross-validation trigger reacts to high risk and disagreement", () => {
  const session = createSession(input).session;
  session.currentPhase = "recommendation";
  session.canvas.risks.push(
    { id: "risk_1", text: "Runway can collapse", impact: "high", likelihood: "medium" },
    { id: "risk_2", text: "Execution cost can be underestimated", impact: "high", likelihood: "medium" }
  );
  session.canvas.claims.push(
    { id: "claim_1", text: "Do not quit immediately", stance: "challenge" },
    { id: "claim_2", text: "The plan depends on unproven demand", stance: "caution" },
    { id: "claim_3", text: "Validation is safer", stance: "caution" }
  );

  const trigger = evaluateCrossValidationTrigger(session);
  assert.equal(trigger.shouldValidate, true);
  assert.equal(trigger.severity, "high");
});

test("claim aggregation deduplicates and surfaces disagreement", () => {
  const session = createSession(input).session;
  session.canvas.claims.push(
    { id: "claim_1", text: "Validation should happen before quitting", stance: "support", roleId: "operator" },
    { id: "claim_2", text: "Validation should happen before quitting", stance: "support", roleId: "chair" },
    { id: "claim_3", text: "Quitting now is risky", stance: "challenge", roleId: "skeptic", confidence: "high" }
  );

  const result = aggregateClaims(session.canvas);
  assert.equal(result.claims.length, 2);
  assert.equal(result.disagreementPanel.length, 1);
});

test("evaluation engine ranks options with weighted criteria", () => {
  const session = createSession(input).session;
  const options = [
    { id: "a", title: "A", scores: { "Long-term alignment": 5, Risk: 1 } },
    { id: "b", title: "B", scores: { "Long-term alignment": 3, Risk: 5 } }
  ];
  const criteria = session.canvas.criteria.filter((criterion) =>
    ["Long-term alignment", "Risk"].includes(criterion.name)
  );
  const evaluation = evaluateOptions(options, criteria);
  assert.equal(evaluation.rows.length, 2);
  assert.ok(evaluation.rows[0].normalizedScore >= evaluation.rows[1].normalizedScore);
});

test("reliability engine creates predictions and scores outcomes", () => {
  const session = createSession(input).session;
  session.canvas.risks.push({ id: "risk_1", text: "Execution slips", likelihood: "high", impact: "high", roleId: "skeptic" });
  session.agentRuns.push({ roleId: "skeptic", model: "test-model", confidence: "medium", fallback: false });

  const predictions = ensurePredictionRecords(session);
  assert.equal(predictions.length, 1);
  const scored = scorePredictions(predictions, { [predictions[0].id]: true });
  assert.equal(scored[0].status, "scored");

  const profile = buildReliabilityProfile(session);
  assert.equal(profile.roles[0].id, "skeptic");
});

test("privacy governance proposes memory candidates with sensitivity", () => {
  const session = createSession(input).session;
  const candidates = proposeMemoryItems(session);
  assert.ok(candidates.length > 0);
  assert.equal(classifyMemorySensitivity("career and anxiety"), "high");
});
