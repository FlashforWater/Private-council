import test from "node:test";
import assert from "node:assert/strict";
import {
  addEvidenceItem,
  attachMemoryCandidateIds,
  completeRetrospective,
  generateDecisionReport,
  updateMemoryConsent
} from "../src/advancedWorkflows.js";
import { createSession } from "../src/domain.js";

const input = {
  question: "Should I launch the full version?",
  background: "The MVP works and needs a public release decision.",
  currentLeaning: "Launch after one more validation.",
  timeHorizon: "2 weeks",
  emotionalState: "Focused",
  constraints: "Keep API keys private"
};

test("adds evidence to the decision canvas", () => {
  let session = createSession(input).session;
  session = addEvidenceItem(session, {
    text: "Three users asked for the same feature.",
    source: "user interviews",
    quality: "high",
    url: "https://example.com/notes"
  });

  assert.equal(session.canvas.evidence.length, 1);
  assert.equal(session.canvas.evidence[0].quality, "high");
});

test("memory consent accepts and removes a candidate", () => {
  let session = createSession(input).session;
  session.canvas.memoryCandidates = attachMemoryCandidateIds({
    ...session,
    canvas: {
      ...session.canvas,
      memoryCandidates: [
        {
          type: "user_preference",
          text: "User values reversibility.",
          sensitivity: "low",
          requiresConsent: false
        }
      ]
    }
  }).canvas.memoryCandidates;

  session = updateMemoryConsent(session, {
    candidateId: session.canvas.memoryCandidates[0].id,
    decision: "accepted"
  });

  assert.equal(session.canvas.memoryCandidates.length, 0);
  assert.equal(session.canvas.savedMemory.length, 1);
  assert.equal(session.canvas.memoryDecisions[0].decision, "accepted");
});

test("retrospective scores predictions and closes the session", () => {
  let session = createSession(input).session;
  session.canvas.predictions = [
    {
      id: "prediction_1",
      text: "Validation will reveal demand.",
      probability: 0.75,
      status: "pending"
    }
  ];

  session = completeRetrospective(session, {
    outcomeSummary: "Demand was real.",
    predictionOutcomes: { prediction_1: true },
    decisionLesson: "Interview evidence was useful."
  });

  assert.equal(session.status, "reviewed");
  assert.equal(session.currentPhase, "closed");
  assert.equal(session.canvas.predictions[0].status, "scored");
});

test("decision report exports key decision sections", () => {
  const session = createSession(input).session;
  const report = generateDecisionReport(session);

  assert.match(report, /# Decision Report/);
  assert.match(report, /## Problem/);
  assert.match(report, /## Predictions/);
});
