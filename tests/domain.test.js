import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceSession,
  askRole,
  canTransition,
  classifyRisk,
  createSession,
  recordDecision,
  runPhase,
  scheduleReview,
  updateCriterionWeight
} from "../src/domain.js";
import { loadSessions, saveSessions, upsertSession } from "../src/storage.js";

const baseInput = {
  question: "Should I leave my job to build an AI product?",
  background: "I have savings and a prototype, but not many users yet.",
  currentLeaning: "Run a validation before quitting.",
  timeHorizon: "4 weeks",
  emotionalState: "Excited but anxious",
  constraints: "Need income stability, limited weekday time"
};

test("creates a normal decision session with MVP canvas defaults", () => {
  const result = createSession(baseInput, new Date("2026-06-29T00:00:00.000Z"));

  assert.equal(result.blocked, false);
  assert.equal(result.session.currentPhase, "framing");
  assert.equal(result.session.status, "active");
  assert.equal(result.session.canvas.criteria.length, 7);
  assert.equal(result.session.canvas.problem.originalQuestion, baseInput.question);
});

test("blocks high-risk or regulated decisions from normal council flow", () => {
  const risk = classifyRisk("Should I stop medication and change my dosage?");
  assert.equal(risk.allowed, false);
  assert.equal(risk.category, "medical");

  const result = createSession({
    ...baseInput,
    question: "Can you give me an investment recommendation to buy stock?"
  });
  assert.equal(result.blocked, true);
  assert.equal(result.risk.category, "investment");
});

test("validates forward and allowed backward state transitions", () => {
  assert.equal(canTransition("framing", "context_collection"), true);
  assert.equal(canTransition("recommendation", "challenge"), true);
  assert.equal(canTransition("human_decision", "evaluation"), true);
  assert.equal(canTransition("evaluation", "challenge"), false);
});

test("phase execution records structured mock agent output", () => {
  const session = createSession(baseInput).session;
  const next = runPhase(session);

  assert.equal(next.currentPhase, "framing");
  assert.equal(next.agentRuns.length, 1);
  assert.equal(next.agentRuns[0].roleId, "chair");
  assert.ok(next.canvas.problem.refinedQuestion.includes("best next decision"));
  assert.ok(next.canvas.claims.length > 0);
  assert.ok(next.canvas.assumptions.length > 0);
  assert.ok(next.canvas.risks.length > 0);
});

test("advance reaches evaluation, creates options, and generates recommendation", () => {
  let session = createSession(baseInput).session;
  session = advanceSession(session);
  session = advanceSession(session);
  session = advanceSession(session);
  session = advanceSession(session);
  session = advanceSession(session);

  assert.equal(session.currentPhase, "recommendation");
  assert.ok(session.canvas.options.length >= 3);

  session = advanceSession(session);
  assert.equal(session.currentPhase, "human_decision");
  assert.ok(session.canvas.recommendation);
  assert.ok(session.canvas.recommendation.optionId);
});

test("user can ask a role and record a final decision", () => {
  let session = createSession(baseInput).session;
  session = askRole(session, "skeptic", "Challenge quitting immediately.");
  assert.equal(session.agentRuns.at(-1).roleId, "skeptic");
  assert.ok(session.canvas.risks.length > 0);

  session = advanceSession(advanceSession(advanceSession(advanceSession(advanceSession(session)))));
  session = advanceSession(session);
  const optionId = session.canvas.recommendation.optionId;
  session = recordDecision(session, {
    choice: optionId,
    rationale: "I want evidence before irreversible commitment."
  });

  assert.equal(session.currentPhase, "commitment");
  assert.equal(session.status, "decided");
  assert.equal(session.canvas.humanDecision.choice, optionId);
});

test("criteria weights and review plans update the canvas", () => {
  let session = createSession(baseInput).session;
  const criterionId = session.canvas.criteria[0].id;
  session = updateCriterionWeight(session, criterionId, 5);
  assert.equal(session.canvas.criteria[0].weight, 5);

  session = scheduleReview(session, {
    reviewDate: "2026-07-15",
    trigger: "Prototype gets 10 active users"
  });

  assert.equal(session.currentPhase, "scheduled_review");
  assert.equal(session.status, "scheduled_for_review");
  assert.equal(session.canvas.reviewPlan.reviewDate, "2026-07-15");
});

test("storage saves, loads, and upserts sessions", () => {
  const map = new Map();
  const storage = {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key)
  };

  const session = createSession(baseInput).session;
  saveSessions([session], storage);
  assert.equal(loadSessions(storage).length, 1);

  const updated = { ...session, title: "Updated title" };
  const sessions = upsertSession(updated, storage);
  assert.equal(sessions.length, 1);
  assert.equal(loadSessions(storage)[0].title, "Updated title");
});
