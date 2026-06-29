export const DECISION_TYPES = [
  "choice",
  "exploration",
  "review",
  "retrospective",
  "conflict",
  "uncertainty",
  "commitment",
  "emotional_overload"
];

export function routeProtocol(sessionOrInput) {
  const text = collectText(sessionOrInput).toLowerCase();
  const emotionalState = getEmotionalState(sessionOrInput).toLowerCase();
  const constraints = getConstraints(sessionOrInput).join(" ").toLowerCase();

  const signals = {
    hasExplicitOptions: /\b(a or b|between|choose|option|alternatives?|which should i)\b/.test(text),
    wantsIdeas: /\b(explore|brainstorm|possibilities|what could|ideas|方向|可能)\b/.test(text),
    reviewsPlan: /\b(review|critique|evaluate my plan|red team|premortem|评审|复盘计划)\b/.test(text),
    retrospective: /\b(retrospective|why did|what went wrong|postmortem|复盘|回顾)\b/.test(text),
    valueConflict: /\b(conflict|torn|tradeoff|values|stable|freedom|family|relationship|价值|纠结)\b/.test(text),
    missingInfo: /\b(uncertain|not sure|need more information|unknown|research|不知道|信息不足)\b/.test(text),
    commitment: /\b(commit|execute|follow through|habit|start|行动|坚持|执行)\b/.test(text),
    emotionalOverload:
      /\b(overwhelmed|panic|burned out|exhausted|can't think|崩溃|焦虑|过载)\b/.test(text) ||
      /\b(overwhelmed|panic|burned out|exhausted|can't think)\b/.test(emotionalState)
  };

  let decisionType = "choice";
  if (signals.emotionalOverload) decisionType = "emotional_overload";
  else if (signals.retrospective) decisionType = "retrospective";
  else if (signals.reviewsPlan) decisionType = "review";
  else if (signals.valueConflict) decisionType = "conflict";
  else if (signals.missingInfo) decisionType = "uncertainty";
  else if (signals.commitment && !signals.hasExplicitOptions) decisionType = "commitment";
  else if (signals.wantsIdeas && !signals.hasExplicitOptions) decisionType = "exploration";

  return {
    decisionType,
    protocol: protocolFor(decisionType),
    councilComposition: councilFor(decisionType),
    safetyBoundary: "normal",
    informationState: signals.missingInfo || constraints.includes("unknown") ? "insufficient" : "usable",
    userMode: decisionType === "emotional_overload" ? "slow_supportive_clarification" : "structured_deliberation",
    signals,
    rationale: rationaleFor(decisionType)
  };
}

function protocolFor(decisionType) {
  return (
    {
      choice: "decision_matrix_with_challenge",
      exploration: "divergent_then_convergent",
      review: "red_team_and_operator_review",
      retrospective: "prediction_comparison_and_pattern_extraction",
      conflict: "values_negotiation",
      uncertainty: "researcher_gap_analysis_and_minimum_experiment",
      commitment: "operator_action_design",
      emotional_overload: "deceleration_and_context_clarification"
    }[decisionType] || "decision_matrix_with_challenge"
  );
}

function councilFor(decisionType) {
  const base = ["chair", "strategist", "skeptic", "operator", "researcher", "user_advocate"];
  const routes = {
    exploration: ["chair", "researcher", "strategist", "user_advocate"],
    review: ["chair", "skeptic", "operator", "strategist"],
    retrospective: ["reflector", "chair", "operator", "user_advocate"],
    conflict: ["chair", "strategist", "user_advocate", "skeptic"],
    uncertainty: ["chair", "researcher", "operator", "skeptic"],
    commitment: ["chair", "operator", "user_advocate", "skeptic"],
    emotional_overload: ["chair", "user_advocate", "operator"]
  };
  return routes[decisionType] || base;
}

function rationaleFor(decisionType) {
  return (
    {
      choice: "The user appears to need a structured comparison among options.",
      exploration: "The user needs option generation before evaluation.",
      review: "The user has or implies a plan that should be challenged before commitment.",
      retrospective: "The user is asking to learn from a past decision or outcome.",
      conflict: "The issue appears to involve competing values rather than only facts.",
      uncertainty: "The decision depends on missing information and should favor small experiments.",
      commitment: "The user likely knows the direction but needs executable commitment design.",
      emotional_overload: "The user may need slower clarification before high-stakes judgment."
    }[decisionType] || "Default choice protocol."
  );
}

function collectText(value) {
  if (value?.canvas) {
    return [
      value.title,
      value.canvas.problem?.originalQuestion,
      value.canvas.problem?.refinedQuestion,
      value.canvas.context?.background,
      value.canvas.context?.currentLeaning,
      value.canvas.context?.unknowns?.map((item) => item.text).join(" ")
    ].join(" ");
  }
  return [
    value?.question,
    value?.background,
    value?.currentLeaning,
    value?.constraints,
    value?.emotionalState
  ].join(" ");
}

function getEmotionalState(value) {
  return value?.canvas?.emotionalContext?.state || value?.emotionalState || "";
}

function getConstraints(value) {
  const constraints = value?.canvas?.problem?.constraints || value?.constraints || [];
  return Array.isArray(constraints) ? constraints : String(constraints).split(/\n|,/);
}
