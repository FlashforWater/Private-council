import { scorePredictions } from "./reliabilityEngine.js";

export function addEvidenceItem(session, input, now = new Date()) {
  const next = structuredClone(session);
  const text = String(input.text || "").trim();
  if (!text) return next;

  next.canvas.evidence.push({
    id: makeId("evidence"),
    text,
    source: String(input.source || "user").trim(),
    url: String(input.url || "").trim(),
    quality: normalizeQuality(input.quality),
    supportsClaimId: String(input.supportsClaimId || "").trim(),
    createdAt: now.toISOString()
  });
  return stamp(next, now);
}

export function updateMemoryConsent(session, input, now = new Date()) {
  const next = structuredClone(session);
  const candidateId = String(input.candidateId || "");
  const decision = input.decision === "accepted" ? "accepted" : "rejected";
  const candidates = next.canvas.memoryCandidates || [];

  const candidate = candidates.find((item) => item.id === candidateId) || candidates[Number(candidateId)];
  if (!candidate) return next;

  next.canvas.memoryDecisions = next.canvas.memoryDecisions || [];
  next.canvas.memoryDecisions.push({
    id: makeId("memory_decision"),
    candidate,
    decision,
    decidedAt: now.toISOString()
  });

  if (decision === "accepted") {
    next.canvas.savedMemory = next.canvas.savedMemory || [];
    next.canvas.savedMemory.push({
      id: makeId("memory"),
      ...candidate,
      savedAt: now.toISOString()
    });
  }

  next.canvas.memoryCandidates = candidates.filter((item) => item !== candidate);
  return stamp(next, now);
}

export function completeRetrospective(session, input, now = new Date()) {
  const next = structuredClone(session);
  const outcomes = input.predictionOutcomes || {};
  const scoredPredictions = scorePredictions(next.canvas.predictions || [], outcomes);

  next.canvas.predictions = scoredPredictions;
  next.canvas.retrospective = {
    id: makeId("retrospective"),
    outcomeSummary: String(input.outcomeSummary || "").trim(),
    whatHappened: String(input.whatHappened || "").trim(),
    assumptionUpdates: String(input.assumptionUpdates || "").trim(),
    decisionLesson: String(input.decisionLesson || "").trim(),
    scoredAt: now.toISOString(),
    predictionScores: scoredPredictions
      .filter((prediction) => prediction.score !== null)
      .map((prediction) => ({
        predictionId: prediction.id,
        score: prediction.score,
        outcome: prediction.outcome
      }))
  };
  next.status = "reviewed";
  next.currentPhase = "closed";
  return stamp(next, now);
}

export function generateDecisionReport(session) {
  const canvas = session.canvas;
  const lines = [
    `# Decision Report: ${session.title}`,
    "",
    `Status: ${session.status}`,
    `Phase: ${session.currentPhase}`,
    `Created: ${session.createdAt}`,
    `Updated: ${session.updatedAt}`,
    "",
    "## Problem",
    `Original question: ${canvas.problem.originalQuestion}`,
    `Refined question: ${canvas.problem.refinedQuestion || "Not refined yet"}`,
    `Decision type: ${canvas.problem.decisionType}`,
    "",
    "## Recommendation",
    canvas.recommendation
      ? `${canvas.recommendation.optionTitle}: ${canvas.recommendation.rationale}`
      : "No recommendation yet.",
    "",
    "## Human Decision",
    canvas.humanDecision
      ? `${canvas.humanDecision.label}: ${canvas.humanDecision.rationale || "No rationale provided."}`
      : "No human decision yet.",
    "",
    "## Options",
    ...listItems(canvas.options, (option) => `${option.title}: ${option.description}`),
    "",
    "## Top Risks",
    ...listItems(canvas.topRisks || canvas.risks, (risk) => `${risk.text} (${risk.likelihood}/${risk.impact})`),
    "",
    "## Fragile Assumptions",
    ...listItems(canvas.fragileAssumptions || canvas.assumptions, (assumption) => assumption.text),
    "",
    "## Predictions",
    ...listItems(canvas.predictions, (prediction) => `${prediction.text} | p=${prediction.probability} | ${prediction.timeHorizon}`),
    "",
    "## Evidence",
    ...listItems(canvas.evidence, (evidence) => `${evidence.text} | ${evidence.source || "source unknown"} | ${evidence.quality}`),
    "",
    "## Review Plan",
    canvas.reviewPlan
      ? `Date: ${canvas.reviewPlan.reviewDate || "trigger-based"}\nTrigger: ${canvas.reviewPlan.trigger || "none"}`
      : "No review plan yet.",
    ""
  ];
  return lines.join("\n");
}

export function attachMemoryCandidateIds(session) {
  const next = structuredClone(session);
  next.canvas.memoryCandidates = (next.canvas.memoryCandidates || []).map((item, index) => ({
    id: item.id || `memory_candidate_${index + 1}`,
    ...item
  }));
  return next;
}

function listItems(items = [], formatter) {
  if (!items.length) return ["- None"];
  return items.map((item) => `- ${formatter(item)}`);
}

function normalizeQuality(value) {
  return ["low", "medium", "high"].includes(value) ? value : "medium";
}

function stamp(session, now) {
  return { ...session, updatedAt: now.toISOString() };
}

function makeId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
