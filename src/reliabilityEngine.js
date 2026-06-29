export function ensurePredictionRecords(session) {
  const canvas = structuredClone(session.canvas);
  if (canvas.predictions.length) return canvas.predictions;

  const predictions = canvas.risks.slice(0, 3).map((risk, index) => ({
    id: `prediction_${index + 1}`,
    roleId: risk.roleId,
    model: session.agentRuns.find((run) => run.roleId === risk.roleId)?.model || "unknown",
    text: risk.text,
    probability: probabilityFromRisk(risk),
    timeHorizon: canvas.problem.timeHorizon || "2-4 weeks",
    outcomeMetric: risk.mitigation || "User can judge whether this risk occurred.",
    status: "pending"
  }));

  if (!predictions.length) {
    predictions.push({
      id: "prediction_default",
      roleId: "chair",
      model: "unknown",
      text: "The chosen next action will reveal whether the decision is executable.",
      probability: 0.65,
      timeHorizon: canvas.problem.timeHorizon || "2-4 weeks",
      outcomeMetric: "Next action completed and reviewed.",
      status: "pending"
    });
  }

  return predictions;
}

export function scorePredictions(predictions, outcomes = {}) {
  return predictions.map((prediction) => {
    const outcome = outcomes[prediction.id];
    if (outcome === undefined) return { ...prediction, score: null, status: "pending" };
    const actual = outcome ? 1 : 0;
    const score = Math.pow(Number(prediction.probability) - actual, 2);
    return { ...prediction, outcome: actual, score, status: "scored" };
  });
}

export function buildReliabilityProfile(session) {
  const byRole = new Map();
  const byModel = new Map();
  for (const run of session.agentRuns) {
    increment(byRole, run.roleId, run);
    increment(byModel, run.model, run);
  }
  return {
    roles: [...byRole.entries()].map(([id, value]) => ({ id, ...value })),
    models: [...byModel.entries()].map(([id, value]) => ({ id, ...value })),
    note: "Early profile based on run metadata. Prediction scoring becomes meaningful after retrospectives."
  };
}

function increment(map, key, run) {
  if (!key) return;
  const current = map.get(key) || { runs: 0, fallbacks: 0, lowConfidence: 0 };
  current.runs += 1;
  if (run.fallback) current.fallbacks += 1;
  if (run.confidence === "low") current.lowConfidence += 1;
  map.set(key, current);
}

function probabilityFromRisk(risk) {
  const likelihood = { low: 0.25, medium: 0.5, high: 0.75 }[risk.likelihood] || 0.5;
  const impactBoost = risk.impact === "high" ? 0.05 : 0;
  return Math.min(0.9, likelihood + impactBoost);
}
