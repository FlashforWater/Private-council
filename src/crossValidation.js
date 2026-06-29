export function evaluateCrossValidationTrigger(session) {
  const canvas = session.canvas;
  const highImpactRisks = canvas.risks.filter((risk) => risk.impact === "high").length;
  const challengeClaims = canvas.claims.filter((claim) => ["challenge", "caution"].includes(claim.stance)).length;
  const lowConfidenceRuns = session.agentRuns.filter((run) => run.confidence === "low").length;
  const unknowns = canvas.context.unknowns.length;
  const phase = session.currentPhase;

  const reasons = [];
  if (highImpactRisks >= 2) reasons.push("multiple_high_impact_risks");
  if (challengeClaims >= 3) reasons.push("material_disagreement");
  if (lowConfidenceRuns >= 2) reasons.push("low_model_confidence");
  if (unknowns >= 3) reasons.push("many_open_unknowns");
  if (["evaluation", "recommendation"].includes(phase) && (highImpactRisks || challengeClaims)) {
    reasons.push("pre_recommendation_check");
  }

  return {
    shouldValidate: reasons.length > 0,
    severity: reasons.length >= 3 ? "high" : reasons.length >= 1 ? "medium" : "low",
    reasons,
    roles: reasons.length ? ["skeptic", "researcher", "operator"] : []
  };
}

export function summarizeCrossValidation(session) {
  const canvas = session.canvas;
  const repeatedRiskTexts = repeatedTexts(canvas.risks.map((risk) => risk.text));
  const repeatedAssumptions = repeatedTexts(canvas.assumptions.map((item) => item.text));
  const conflicts = canvas.claims
    .filter((claim) => ["challenge", "caution"].includes(claim.stance))
    .slice(-5)
    .map((claim) => claim.text);

  return {
    commonFindings: repeatedRiskTexts,
    sharedAssumptions: repeatedAssumptions,
    conflictJudgments: conflicts,
    minorityOpinions: conflicts.slice(0, 2),
    status: conflicts.length || repeatedRiskTexts.length ? "needs_attention" : "clear_enough"
  };
}

function repeatedTexts(texts) {
  const counts = new Map();
  for (const text of texts) {
    const key = normalize(text);
    if (!key) continue;
    counts.set(key, { text, count: (counts.get(key)?.count || 0) + 1 });
  }
  return [...counts.values()].filter((item) => item.count > 1).map((item) => item.text);
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, " ")
    .trim();
}
