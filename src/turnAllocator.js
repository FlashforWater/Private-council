import { rolesForPhase } from "./domain.js";

export function allocateTurns(session, phase = session.currentPhase, context = {}) {
  const route = context.protocolRoute || session.protocolRoute || session.canvas?.protocolRoute;
  const trigger = context.crossValidationTrigger || session.canvas?.crossValidationTrigger;
  const base = rolesForPhase(phase);
  const selected = new Set(base);
  const reasons = [];

  if (route?.decisionType === "uncertainty") {
    selected.add("researcher");
    selected.add("operator");
    reasons.push("Information is insufficient; Researcher and Operator should produce fact gaps and experiments.");
  }

  if (route?.decisionType === "conflict") {
    selected.add("user_advocate");
    selected.add("strategist");
    reasons.push("Value conflict requires personal-fit and long-term tradeoff roles.");
  }

  if (route?.decisionType === "review") {
    selected.add("skeptic");
    selected.add("operator");
    reasons.push("Review protocol favors red-team and executability checks.");
  }

  if (route?.decisionType === "emotional_overload") {
    selected.clear();
    selected.add("chair");
    selected.add("user_advocate");
    reasons.push("Emotional overload should slow down and avoid full-council noise.");
  }

  if (trigger?.shouldValidate) {
    selected.add("skeptic");
    selected.add("researcher");
    selected.add("operator");
    reasons.push("Cross-validation trigger requires independent risk, evidence, and execution checks.");
  }

  const roleIds = [...selected].filter((roleId) => roleId !== "reflector" || phase === "retrospective");
  return {
    phase,
    roleIds,
    mode: phase === "independent_views" ? "silent_independent" : "interactive_structured",
    maxTurns: route?.decisionType === "emotional_overload" ? 2 : Math.max(1, roleIds.length),
    reasons
  };
}
