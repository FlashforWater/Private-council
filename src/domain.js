import { routeProtocol } from "./protocolRouter.js";

export const SESSION_PHASES = [
  "created",
  "framing",
  "context_collection",
  "independent_views",
  "challenge",
  "evaluation",
  "recommendation",
  "human_decision",
  "commitment",
  "scheduled_review",
  "retrospective",
  "closed"
];

export const PHASE_LABELS = {
  created: "Created",
  framing: "Framing",
  context_collection: "Context",
  independent_views: "Views",
  challenge: "Challenge",
  evaluation: "Evaluation",
  recommendation: "Recommendation",
  human_decision: "Decision",
  commitment: "Commitment",
  scheduled_review: "Review Plan",
  retrospective: "Retrospective",
  closed: "Closed"
};

export const COUNCIL_ROLES = [
  {
    id: "chair",
    name: "Chair",
    color: "ink",
    purpose: "Keeps the meeting structured and preserves disagreement."
  },
  {
    id: "strategist",
    name: "Strategist",
    color: "blue",
    purpose: "Tests long-term alignment and opportunity cost."
  },
  {
    id: "skeptic",
    name: "Skeptic",
    color: "red",
    purpose: "Attacks weak assumptions and failure paths."
  },
  {
    id: "operator",
    name: "Operator",
    color: "green",
    purpose: "Turns judgment into executable next actions."
  },
  {
    id: "researcher",
    name: "Researcher",
    color: "violet",
    purpose: "Separates facts, assumptions, and information gaps."
  },
  {
    id: "user_advocate",
    name: "User Advocate",
    color: "amber",
    purpose: "Protects energy, values, and lived constraints."
  },
  {
    id: "reflector",
    name: "Reflector",
    color: "teal",
    purpose: "Compares predictions with outcomes during review."
  }
];

export const DEFAULT_CRITERIA = [
  { name: "Long-term alignment", weight: 4 },
  { name: "Expected upside", weight: 4 },
  { name: "Execution cost", weight: 3 },
  { name: "Risk", weight: 4 },
  { name: "Reversibility", weight: 3 },
  { name: "Emotional cost", weight: 3 },
  { name: "Information sufficiency", weight: 3 }
];

const HIGH_RISK_PATTERNS = [
  {
    category: "self-harm",
    pattern: /\b(kill myself|suicide|self[- ]?harm|end my life|hurt myself)\b/i
  },
  {
    category: "violence",
    pattern: /\b(hurt someone|attack someone|kill someone|violent revenge)\b/i
  },
  {
    category: "medical",
    pattern: /\b(diagnose|medical diagnosis|prescription|dosage|cancer treatment|stop medication)\b/i
  },
  {
    category: "legal",
    pattern: /\b(legal advice|lawsuit strategy|evade law|court defense|immigration case)\b/i
  },
  {
    category: "investment",
    pattern: /\b(buy stock|sell stock|crypto trade|investment recommendation|options trade)\b/i
  }
];

export function classifyRisk(text) {
  const source = String(text || "");
  const match = HIGH_RISK_PATTERNS.find((item) => item.pattern.test(source));
  if (!match) {
    return { allowed: true, category: "normal", message: "" };
  }

  return {
    allowed: false,
    category: match.category,
    message:
      "This looks like a high-risk or regulated decision. Private Council should not run a normal advice session for it. Use this space to organize questions for qualified support, clarify non-professional considerations, or make an immediate safety plan if there is urgent danger."
  };
}

export function createSession(input, now = new Date()) {
  const risk = classifyRisk(
    [
      input.question,
      input.background,
      input.currentLeaning,
      input.constraints,
      input.emotionalState
    ].join(" ")
  );

  if (!risk.allowed) {
    return { blocked: true, risk };
  }

  const createdAt = now.toISOString();
  const title = input.question.trim() || "Untitled decision";
  const protocolRoute = routeProtocol(input);

  return {
    blocked: false,
    session: {
      id: makeId("session"),
      title,
      status: "active",
      currentPhase: "framing",
      createdAt,
      updatedAt: createdAt,
      protocolRoute,
      canvas: {
        id: makeId("canvas"),
        problem: {
          originalQuestion: title,
          refinedQuestion: "",
          decisionType: protocolRoute.decisionType,
          timeHorizon: input.timeHorizon.trim(),
          constraints: splitLines(input.constraints)
        },
        protocolRoute,
        context: {
          background: input.background.trim(),
          currentLeaning: input.currentLeaning.trim(),
          knownFacts: [],
          unknowns: []
        },
        emotionalContext: {
          state: input.emotionalState.trim(),
          notes: ""
        },
        options: [],
        criteria: DEFAULT_CRITERIA.map((criterion) => ({
          id: makeId("criterion"),
          ...criterion
        })),
        claims: [],
        evidence: [],
        assumptions: [],
        objections: [],
        risks: [],
        predictions: [],
        recommendation: null,
        humanDecision: null,
        actionCommitments: [],
        reviewPlan: null
      },
      transcript: [
        {
          id: makeId("msg"),
          speaker: "user",
          roleId: "user",
          phase: "created",
          content: title,
          createdAt
        }
      ],
      agentRuns: []
    }
  };
}

export function canTransition(from, to) {
  if (from === "framing" && to === "context_collection") return true;
  if (from === "recommendation" && to === "challenge") return true;
  if (from === "human_decision" && to === "evaluation") return true;

  const fromIndex = SESSION_PHASES.indexOf(from);
  const toIndex = SESSION_PHASES.indexOf(to);
  return fromIndex >= 0 && toIndex === fromIndex + 1;
}

export function nextPhase(phase) {
  const index = SESSION_PHASES.indexOf(phase);
  if (index < 0 || index >= SESSION_PHASES.length - 1) return phase;
  return SESSION_PHASES[index + 1];
}

export function runPhase(session, now = new Date()) {
  const phase = session.currentPhase;
  const roles = rolesForPhase(phase);
  let next = clone(session);

  for (const roleId of roles) {
    const output = createMockAgentOutput(roleId, next, { mode: "phase" });
    next = applyAgentOutput(next, roleId, output, now);
  }

  if (phase === "evaluation") {
    next = ensureOptions(next, now);
  }

  if (phase === "recommendation") {
    next = ensureRecommendation(next, now);
  }

  return stamp(next, now);
}

export function advanceSession(session, now = new Date()) {
  const phase = session.currentPhase;
  let next = runPhase(session, now);
  const target = nextPhase(phase);
  if (canTransition(phase, target)) {
    next.currentPhase = target;
  }
  return stamp(next, now);
}

export function moveSessionTo(session, phase, now = new Date()) {
  if (!canTransition(session.currentPhase, phase)) {
    throw new Error(`Invalid transition: ${session.currentPhase} -> ${phase}`);
  }
  return stamp({ ...clone(session), currentPhase: phase }, now);
}

export function askRole(session, roleId, prompt, now = new Date()) {
  const role = getRole(roleId);
  if (!role) throw new Error(`Unknown role: ${roleId}`);

  let next = clone(session);
  next.transcript.push({
    id: makeId("msg"),
    speaker: "user",
    roleId: "user",
    phase: next.currentPhase,
    content: prompt.trim(),
    createdAt: now.toISOString()
  });

  const output = createMockAgentOutput(roleId, next, {
    mode: roleId === "skeptic" ? "challenge" : "ask",
    prompt
  });
  next = applyAgentOutput(next, roleId, output, now);
  return stamp(next, now);
}

export function clarifyContext(session, text, now = new Date()) {
  const next = clone(session);
  const value = text.trim();
  if (!value) return next;

  next.canvas.context.knownFacts.push({
    id: makeId("fact"),
    text: value,
    source: "user"
  });
  next.transcript.push({
    id: makeId("msg"),
    speaker: "user",
    roleId: "user",
    phase: next.currentPhase,
    content: `Context clarification: ${value}`,
    createdAt: now.toISOString()
  });
  return stamp(next, now);
}

export function updateCriterionWeight(session, criterionId, weight, now = new Date()) {
  const next = clone(session);
  const criterion = next.canvas.criteria.find((item) => item.id === criterionId);
  if (criterion) criterion.weight = clamp(Number(weight), 1, 5);
  return stamp(next, now);
}

export function recordDecision(session, decisionInput, now = new Date()) {
  const next = clone(session);
  const choice = String(decisionInput.choice || "defer");
  const option = next.canvas.options.find((item) => item.id === choice);

  next.canvas.humanDecision = {
    id: makeId("decision"),
    choice,
    label: option ? option.title : decisionLabel(choice),
    rationale: String(decisionInput.rationale || "").trim(),
    decidedAt: now.toISOString(),
    aiRecommendation: next.canvas.recommendation?.optionId || null
  };
  next.currentPhase = "commitment";
  next.status = choice === "defer" ? "active" : "decided";
  next.transcript.push({
    id: makeId("msg"),
    speaker: "user",
    roleId: "user",
    phase: "human_decision",
    content: `Decision: ${next.canvas.humanDecision.label}`,
    createdAt: now.toISOString()
  });

  return stamp(next, now);
}

export function addCommitment(session, input, now = new Date()) {
  const next = clone(session);
  const action = String(input.action || "").trim();
  if (action) {
    next.canvas.actionCommitments.push({
      id: makeId("commitment"),
      action,
      successCriteria: String(input.successCriteria || "").trim(),
      dueDate: String(input.dueDate || "").trim(),
      owner: "user",
      createdAt: now.toISOString()
    });
  }
  return stamp(next, now);
}

export function scheduleReview(session, input, now = new Date()) {
  const next = clone(session);
  next.canvas.reviewPlan = {
    id: makeId("review"),
    reviewDate: String(input.reviewDate || "").trim(),
    trigger: String(input.trigger || "").trim(),
    questions: [
      "What actually happened?",
      "Which assumptions were wrong?",
      "Did the next action happen?",
      "What should change in future decisions?"
    ]
  };
  next.currentPhase = "scheduled_review";
  next.status = "scheduled_for_review";
  return stamp(next, now);
}

export function createMockAgentOutput(roleId, session, options = {}) {
  const role = getRole(roleId);
  if (!role) throw new Error(`Unknown role: ${roleId}`);

  const question = session.canvas.problem.originalQuestion;
  const phase = session.currentPhase;
  const prompt = String(options.prompt || "");
  const template = roleTemplates[roleId] || roleTemplates.chair;
  const summary = template.summary({ question, phase, prompt, session });

  return {
    summary,
    claims: template.claims({ question, phase, prompt, session }),
    assumptions: template.assumptions({ question, phase, prompt, session }),
    risks: template.risks({ question, phase, prompt, session }),
    questionsForUser: template.questions({ question, phase, prompt, session }),
    recommendedActions: template.actions({ question, phase, prompt, session }),
    confidence: template.confidence
  };
}

export function rolesForPhase(phase) {
  switch (phase) {
    case "framing":
      return ["chair"];
    case "context_collection":
      return ["chair", "researcher", "user_advocate"];
    case "independent_views":
      return ["chair", "strategist", "skeptic", "operator", "researcher", "user_advocate"];
    case "challenge":
      return ["skeptic", "strategist", "operator"];
    case "evaluation":
      return ["strategist", "operator", "researcher", "user_advocate"];
    case "recommendation":
      return ["chair"];
    case "commitment":
      return ["operator", "chair"];
    case "retrospective":
      return ["reflector"];
    default:
      return [];
  }
}

export function applyAgentOutput(session, roleId, output, now = new Date(), runMeta = {}) {
  const next = clone(session);
  const role = getRole(roleId);
  const createdAt = now.toISOString();
  const agentRunId = makeId("run");

  next.agentRuns.push({
    id: agentRunId,
    roleId,
    model: runMeta.model || "mock-agent-v1",
    provider: runMeta.provider || "local",
    selectionReason: runMeta.selectionReason || "mock_or_default",
    fallback: Boolean(runMeta.fallback),
    phase: next.currentPhase,
    confidence: output.confidence || "medium",
    output,
    createdAt
  });

  next.transcript.push({
    id: makeId("msg"),
    speaker: role.name,
    roleId,
    phase: next.currentPhase,
    content: output.summary,
    createdAt
  });

  for (const claim of output.claims || []) {
    next.canvas.claims.push({
      id: makeId("claim"),
      roleId,
      text: claim.text,
      stance: claim.stance || "neutral",
      confidence: claim.confidence || output.confidence || "medium",
      sourceRunId: agentRunId
    });
  }

  for (const assumption of output.assumptions || []) {
    next.canvas.assumptions.push({
      id: makeId("assumption"),
      roleId,
      text: assumption.text,
      criticality: assumption.criticality || "medium",
      sourceRunId: agentRunId
    });
  }

  for (const risk of output.risks || []) {
    next.canvas.risks.push({
      id: makeId("risk"),
      roleId,
      text: risk.text,
      likelihood: risk.likelihood || "medium",
      impact: risk.impact || "medium",
      mitigation: risk.mitigation || "",
      sourceRunId: agentRunId
    });
  }

  for (const question of output.questionsForUser || []) {
    if (!next.canvas.context.unknowns.some((item) => item.text === question)) {
      next.canvas.context.unknowns.push({
        id: makeId("unknown"),
        text: question,
        roleId
      });
    }
  }

  if (roleId === "chair" && next.currentPhase === "framing") {
    next.canvas.problem.refinedQuestion =
      next.canvas.problem.refinedQuestion ||
      `What is the best next decision about "${next.canvas.problem.originalQuestion}" given your goals, constraints, energy, and review horizon?`;
  }

  return next;
}

export function ensureOptions(session, now = new Date()) {
  const next = clone(session);
  if (next.canvas.options.length === 0) {
    next.canvas.options.push(
      {
        id: makeId("option"),
        title: "Commit now",
        description: "Choose a direction and define the smallest serious next action.",
        scores: scoreDefaults([4, 4, 2, 3, 2, 3, 3])
      },
      {
        id: makeId("option"),
        title: "Run a small validation",
        description: "Delay the final choice until a low-cost experiment resolves the biggest unknown.",
        scores: scoreDefaults([4, 3, 4, 4, 5, 4, 5])
      },
      {
        id: makeId("option"),
        title: "Defer intentionally",
        description: "Do not decide yet; collect the missing information and set a review trigger.",
        scores: scoreDefaults([3, 2, 5, 4, 5, 4, 4])
      }
    );
  }

  if (next.canvas.predictions.length === 0) {
    next.canvas.predictions.push({
      id: makeId("prediction"),
      text: "The first week of execution will reveal whether the plan is energy-compatible.",
      probability: 0.65,
      timeHorizon: "1 week",
      outcomeMetric: "Next action completed without major friction",
      createdAt: now.toISOString()
    });
  }

  return next;
}

export function ensureRecommendation(session, now = new Date()) {
  let next = ensureOptions(session, now);
  const ranked = rankOptions(next.canvas.options, next.canvas.criteria);
  const winner = ranked[0];
  const objections = next.canvas.risks.slice(-3).map((risk) => risk.text);
  const assumptions = next.canvas.assumptions.slice(-3).map((assumption) => assumption.text);

  next.canvas.recommendation = {
    id: makeId("recommendation"),
    optionId: winner.option.id,
    optionTitle: winner.option.title,
    rationale:
      "This option keeps the decision actionable while preserving reversibility and protecting against the largest unknowns.",
    confidence: winner.score >= 70 ? "high" : "medium",
    keyAssumptions: assumptions,
    mainObjections: objections,
    minimumNextAction: "Define a 30-minute next action that tests the most fragile assumption.",
    reviewTiming: "Review after 7-14 days or when a major new signal appears.",
    createdAt: now.toISOString()
  };

  return next;
}

export function rankOptions(options, criteria) {
  return options
    .map((option) => {
      const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
      const weighted = criteria.reduce((sum, criterion) => {
        const score = option.scores?.[criterion.name] || 3;
        return sum + score * criterion.weight;
      }, 0);
      return {
        option,
        score: Math.round((weighted / (totalWeight * 5)) * 100)
      };
    })
    .sort((a, b) => b.score - a.score);
}

function scoreDefaults(values) {
  return Object.fromEntries(DEFAULT_CRITERIA.map((criterion, index) => [criterion.name, values[index]]));
}

function decisionLabel(choice) {
  return (
    {
      modify: "Modify recommendation",
      defer: "Defer decision",
      reject: "Reject all options"
    }[choice] || "Custom decision"
  );
}

function getRole(roleId) {
  return COUNCIL_ROLES.find((role) => role.id === roleId);
}

function splitLines(value) {
  return String(value || "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function stamp(session, now) {
  return { ...session, updatedAt: now.toISOString() };
}

function clone(value) {
  return structuredClone(value);
}

function makeId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

const roleTemplates = {
  chair: {
    confidence: "medium",
    summary: ({ question, phase }) => {
      if (phase === "framing") {
        return `I will frame "${question}" as a decision with options, constraints, assumptions, and a review point. The goal is clarity before advice.`;
      }
      if (phase === "recommendation") {
        return "The recommendation should remain advisory: show the preferred path, the strongest objections, and the smallest next action for the user to accept, modify, or reject.";
      }
      return "I am keeping the discussion bounded and turning the useful disagreement into a traceable decision canvas.";
    },
    claims: ({ phase }) => [
      {
        text:
          phase === "framing"
            ? "The first task is to define the real decision, not to rush into advice."
            : "The council should preserve dissent until the user has enough structure to decide.",
        stance: "support",
        confidence: "high"
      }
    ],
    assumptions: () => [
      {
        text: "The user wants a decision-quality process rather than a fast generic answer.",
        criticality: "high"
      }
    ],
    risks: () => [
      {
        text: "The session could become verbose without improving judgment.",
        likelihood: "medium",
        impact: "medium",
        mitigation: "Keep each phase tied to a canvas update."
      }
    ],
    questions: () => ["What would make this decision feel settled enough to act on?"],
    actions: () => ["Confirm or edit the refined decision question."]
  },
  strategist: {
    confidence: "medium",
    summary: () =>
      "The strategic test is whether this decision serves the user's longer arc, not only the strongest short-term emotion or opportunity.",
    claims: () => [
      {
        text: "Opportunity cost should be visible before the user commits.",
        stance: "caution",
        confidence: "medium"
      }
    ],
    assumptions: () => [
      {
        text: "The user's long-term goals are stable enough to compare options against.",
        criticality: "medium"
      }
    ],
    risks: () => [
      {
        text: "A locally attractive option may crowd out a more important long-term path.",
        likelihood: "medium",
        impact: "high",
        mitigation: "Score each option against long-term alignment."
      }
    ],
    questions: () => ["Which long-term goal should this decision serve first?"],
    actions: () => ["Name the opportunity cost of the leading option."]
  },
  skeptic: {
    confidence: "medium",
    summary: ({ prompt }) =>
      prompt
        ? `I would challenge this by asking what has to be true for "${prompt}" to work, and what evidence would prove it false.`
        : "The strongest challenge is to identify the assumption that would collapse the plan if wrong.",
    claims: () => [
      {
        text: "The leading option needs a premortem before it deserves confidence.",
        stance: "challenge",
        confidence: "high"
      }
    ],
    assumptions: () => [
      {
        text: "Current confidence may be partly driven by incomplete information.",
        criticality: "high"
      }
    ],
    risks: () => [
      {
        text: "Execution cost, emotional cost, or dependency risk may be underestimated.",
        likelihood: "medium",
        impact: "high",
        mitigation: "Run a small validation before irreversible commitment."
      }
    ],
    questions: () => ["If this fails in 30 days, what is the most likely reason?"],
    actions: () => ["Write the failure path in one sentence before deciding."]
  },
  operator: {
    confidence: "medium",
    summary: () =>
      "The practical version of the decision is the next action, success metric, deadline, and review trigger.",
    claims: () => [
      {
        text: "A decision without a next action is still unresolved.",
        stance: "support",
        confidence: "high"
      }
    ],
    assumptions: () => [
      {
        text: "The user can reserve at least one concrete block of time for the first step.",
        criticality: "medium"
      }
    ],
    risks: () => [
      {
        text: "The plan may be too large to start cleanly.",
        likelihood: "medium",
        impact: "medium",
        mitigation: "Reduce the first action to something finishable in under an hour."
      }
    ],
    questions: () => ["What is the smallest action that would create new information?"],
    actions: () => ["Define a next action with a date and success criterion."]
  },
  researcher: {
    confidence: "low",
    summary: () =>
      "The evidence boundary is still important: separate known facts, assumptions, and facts that need outside verification.",
    claims: () => [
      {
        text: "The session should not treat unverified assumptions as facts.",
        stance: "caution",
        confidence: "high"
      }
    ],
    assumptions: () => [
      {
        text: "Some missing information can be resolved with a small search, conversation, or experiment.",
        criticality: "medium"
      }
    ],
    risks: () => [
      {
        text: "The recommendation may overfit to the user's current narrative.",
        likelihood: "medium",
        impact: "medium",
        mitigation: "List the facts that would change the recommendation."
      }
    ],
    questions: () => ["What fact, if discovered, would change the decision?"],
    actions: () => ["Create a short missing-information list."]
  },
  user_advocate: {
    confidence: "medium",
    summary: () =>
      "The recommendation has to fit the user's actual energy, emotions, values, and relationships, not only an abstract payoff table.",
    claims: () => [
      {
        text: "Emotional cost is a decision signal and should be included explicitly.",
        stance: "support",
        confidence: "high"
      }
    ],
    assumptions: () => [
      {
        text: "The user's current emotional state may influence both risk tolerance and follow-through.",
        criticality: "medium"
      }
    ],
    risks: () => [
      {
        text: "A rational-looking plan may fail because it ignores energy and support constraints.",
        likelihood: "medium",
        impact: "high",
        mitigation: "Adjust the next action to the user's real capacity."
      }
    ],
    questions: () => ["Which option would you actually have energy to live with?"],
    actions: () => ["Mark any option that looks good but feels unsustainable."]
  },
  reflector: {
    confidence: "medium",
    summary: () =>
      "The retrospective should compare predictions with reality and update the user's decision patterns.",
    claims: () => [
      {
        text: "A decision becomes learning material only when predictions are checked later.",
        stance: "support",
        confidence: "high"
      }
    ],
    assumptions: () => [
      {
        text: "The user can report what happened honestly enough to learn from it.",
        criticality: "medium"
      }
    ],
    risks: () => [],
    questions: () => ["Which prediction was most wrong or most useful?"],
    actions: () => ["Record outcome, deviation, and a lesson for next time."]
  }
};
