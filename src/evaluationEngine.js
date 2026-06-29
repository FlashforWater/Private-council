export function evaluateOptions(options, criteria) {
  const totalWeight = criteria.reduce((sum, criterion) => sum + Number(criterion.weight || 0), 0) || 1;
  const rows = options.map((option) => {
    const criterionScores = criteria.map((criterion) => {
      const rawScore = Number(option.scores?.[criterion.name] || 3);
      const weightedScore = rawScore * Number(criterion.weight || 0);
      return {
        criterionId: criterion.id,
        criterionName: criterion.name,
        weight: criterion.weight,
        score: rawScore,
        weightedScore
      };
    });
    const weightedTotal = criterionScores.reduce((sum, item) => sum + item.weightedScore, 0);
    return {
      optionId: option.id,
      optionTitle: option.title,
      weightedTotal,
      normalizedScore: Math.round((weightedTotal / (totalWeight * 5)) * 100),
      criterionScores,
      weakestCriteria: criterionScores
        .filter((item) => item.score <= 2)
        .map((item) => item.criterionName)
    };
  });

  rows.sort((a, b) => b.normalizedScore - a.normalizedScore);
  return {
    rows,
    preferredOptionId: rows[0]?.optionId || null,
    sensitivity: computeSensitivity(rows),
    method: "weighted_multi_criteria_decision_analysis"
  };
}

export function buildDefaultOptionsIfMissing(canvas) {
  if (canvas.options.length) return canvas.options;
  const criteria = canvas.criteria.map((criterion) => criterion.name);
  return [
    option("Commit now", "Choose a direction and define the smallest serious next action.", criteria, [4, 4, 2, 3, 2, 3, 3]),
    option("Run a small validation", "Use a low-cost experiment to resolve the biggest unknown first.", criteria, [4, 3, 4, 4, 5, 4, 5]),
    option("Defer intentionally", "Delay the final decision with a clear information trigger.", criteria, [3, 2, 5, 4, 5, 4, 4])
  ];
}

function computeSensitivity(rows) {
  if (rows.length < 2) return { margin: 100, interpretation: "Only one option is available." };
  const margin = rows[0].normalizedScore - rows[1].normalizedScore;
  return {
    margin,
    interpretation: margin <= 8 ? "Recommendation is sensitive to criteria weights." : "Top option is reasonably stable under current weights."
  };
}

function option(title, description, criteria, values) {
  return {
    id: `option_${slug(title)}`,
    title,
    description,
    scores: Object.fromEntries(criteria.map((criterion, index) => [criterion, values[index] || 3]))
  };
}

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}
