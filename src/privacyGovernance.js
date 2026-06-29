export function proposeMemoryItems(session) {
  const canvas = session.canvas;
  const candidates = [
    ...canvas.criteria.filter((criterion) => criterion.weight >= 4).map((criterion) => ({
      type: "user_preference",
      text: `User gives high weight to ${criterion.name}.`,
      sensitivity: sensitivityFor(criterion.name),
      requiresConsent: sensitivityFor(criterion.name) !== "low"
    })),
    ...canvas.actionCommitments.map((commitment) => ({
      type: "decision_memory",
      text: `Committed action: ${commitment.action}`,
      sensitivity: "medium",
      requiresConsent: false
    }))
  ];

  return dedupe(candidates);
}

export function classifyMemorySensitivity(text) {
  const value = String(text || "").toLowerCase();
  if (/\b(health|medical|therapy|relationship|family|money|income|identity|mental|anxiety|depression)\b/.test(value)) {
    return "high";
  }
  if (/\b(career|job|startup|product|time|energy|emotion)\b/.test(value)) {
    return "medium";
  }
  return "low";
}

function sensitivityFor(text) {
  return classifyMemorySensitivity(text);
}

function dedupe(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.type + item.text;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
