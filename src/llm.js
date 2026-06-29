export const structuredAgentOutputSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    claims: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          text: { type: "string" },
          stance: { type: "string", enum: ["support", "caution", "challenge", "neutral"] },
          confidence: { type: "string", enum: ["low", "medium", "high"] }
        },
        required: ["text", "stance", "confidence"]
      }
    },
    assumptions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          text: { type: "string" },
          criticality: { type: "string", enum: ["low", "medium", "high"] }
        },
        required: ["text", "criticality"]
      }
    },
    risks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          text: { type: "string" },
          likelihood: { type: "string", enum: ["low", "medium", "high"] },
          impact: { type: "string", enum: ["low", "medium", "high"] },
          mitigation: { type: "string" }
        },
        required: ["text", "likelihood", "impact", "mitigation"]
      }
    },
    questionsForUser: {
      type: "array",
      items: { type: "string" }
    },
    recommendedActions: {
      type: "array",
      items: { type: "string" }
    },
    confidence: { type: "string", enum: ["low", "medium", "high"] }
  },
  required: [
    "summary",
    "claims",
    "assumptions",
    "risks",
    "questionsForUser",
    "recommendedActions",
    "confidence"
  ]
};

export function buildAgentPrompt({ role, session, options = {} }) {
  const canvas = session.canvas;
  const outputLanguage =
    session.locale === "zh"
      ? "Respond in Simplified Chinese for all human-readable text values inside the JSON."
      : "Respond in English for all human-readable text values inside the JSON.";
  const system = [
    "You are one role in Private Council, a structured personal decision council.",
    "You advise; the human decides.",
    "Preserve useful disagreement. Do not give regulated medical, legal, investment, or crisis advice.",
    `Your role is ${role.name}: ${role.purpose}`,
    outputLanguage,
    "Return only valid JSON matching the requested schema. No Markdown, no commentary."
  ].join("\n");

  const user = JSON.stringify(
    {
      task: "Produce one structured council contribution for the current phase.",
      mode: options.mode || "phase",
      directUserPrompt: options.prompt || "",
      phase: session.currentPhase,
      locale: session.locale || "en",
      decision: {
        originalQuestion: canvas.problem.originalQuestion,
        refinedQuestion: canvas.problem.refinedQuestion,
        decisionType: canvas.problem.decisionType,
        timeHorizon: canvas.problem.timeHorizon,
        constraints: canvas.problem.constraints,
        background: canvas.context.background,
        currentLeaning: canvas.context.currentLeaning,
        emotionalState: canvas.emotionalContext?.state || ""
      },
      currentCanvas: {
        options: canvas.options.map((item) => pick(item, ["title", "description"])),
        criteria: canvas.criteria.map((item) => pick(item, ["name", "weight"])),
        recentClaims: canvas.claims.slice(-8).map((item) => pick(item, ["roleId", "text", "stance"])),
        recentAssumptions: canvas.assumptions.slice(-8).map((item) => pick(item, ["roleId", "text", "criticality"])),
        recentRisks: canvas.risks.slice(-8).map((item) => pick(item, ["roleId", "text", "likelihood", "impact"])),
        unknowns: canvas.context.unknowns.slice(-8).map((item) => item.text)
      },
      outputContract: {
        summary: "One concise paragraph, role-specific.",
        claims: "1-3 claim objects. Use support/caution/challenge/neutral stance.",
        assumptions: "1-3 assumptions that matter for the decision.",
        risks: "0-3 risks with likelihood, impact, and mitigation.",
        questionsForUser: "0-2 concrete questions.",
        recommendedActions: "0-2 concrete actions.",
        confidence: "low, medium, or high."
      }
    },
    null,
    2
  );

  return { system, user };
}

export function parseJsonFromText(text) {
  if (typeof text !== "string") return text;
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) return JSON.parse(fenced[1]);

    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Model did not return parseable JSON.");
  }
}

export function normalizeStructuredOutput(value) {
  const output = value && typeof value === "object" ? value : {};
  return {
    summary: stringOr(output.summary, "No summary returned."),
    claims: normalizeArray(output.claims).map((item) => ({
      text: stringOr(item.text, ""),
      stance: enumOr(item.stance, ["support", "caution", "challenge", "neutral"], "neutral"),
      confidence: enumOr(item.confidence, ["low", "medium", "high"], "medium")
    })).filter((item) => item.text),
    assumptions: normalizeArray(output.assumptions).map((item) => ({
      text: stringOr(item.text, ""),
      criticality: enumOr(item.criticality, ["low", "medium", "high"], "medium")
    })).filter((item) => item.text),
    risks: normalizeArray(output.risks).map((item) => ({
      text: stringOr(item.text, ""),
      likelihood: enumOr(item.likelihood, ["low", "medium", "high"], "medium"),
      impact: enumOr(item.impact, ["low", "medium", "high"], "medium"),
      mitigation: stringOr(item.mitigation, "")
    })).filter((item) => item.text),
    questionsForUser: normalizeArray(output.questionsForUser).map((item) => String(item)).filter(Boolean),
    recommendedActions: normalizeArray(output.recommendedActions).map((item) => String(item)).filter(Boolean),
    confidence: enumOr(output.confidence, ["low", "medium", "high"], "medium")
  };
}

function pick(object, keys) {
  return Object.fromEntries(keys.map((key) => [key, object[key]]));
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function stringOr(value, fallback) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function enumOr(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}
