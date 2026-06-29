export function aggregateClaims(canvas) {
  const claims = dedupeByText(canvas.claims);
  const assumptions = dedupeByText(canvas.assumptions);
  const risks = dedupeByText(canvas.risks);

  const claimGraph = claims.map((claim) => ({
    id: claim.id,
    text: claim.text,
    stance: claim.stance,
    supportCount: claims.filter((item) => item.stance === "support" && overlaps(item.text, claim.text)).length,
    challengeCount: claims.filter((item) => ["challenge", "caution"].includes(item.stance) && overlaps(item.text, claim.text)).length,
    sourceRoleIds: unique(claims.filter((item) => overlaps(item.text, claim.text)).map((item) => item.roleId))
  }));

  const disagreementPanel = claims
    .filter((claim) => ["challenge", "caution"].includes(claim.stance))
    .map((claim) => ({
      claimId: claim.id,
      text: claim.text,
      roleId: claim.roleId,
      severity: claim.confidence === "high" ? "high" : "medium"
    }))
    .slice(-8);

  return {
    claims,
    assumptions,
    risks,
    claimGraph,
    disagreementPanel,
    fragileAssumptions: assumptions.filter((item) => item.criticality === "high").slice(-6),
    topRisks: risks
      .slice()
      .sort((a, b) => riskScore(b) - riskScore(a))
      .slice(0, 6)
  };
}

function dedupeByText(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = normalize(item.text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

function overlaps(a, b) {
  const left = new Set(normalize(a).split(" ").filter(Boolean));
  const right = normalize(b).split(" ").filter(Boolean);
  if (!left.size || !right.length) return false;
  return right.filter((word) => left.has(word)).length >= Math.min(2, right.length);
}

function riskScore(risk) {
  const value = { low: 1, medium: 2, high: 3 };
  return (value[risk.likelihood] || 2) * (value[risk.impact] || 2);
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, " ")
    .trim();
}
