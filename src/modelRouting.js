export const ROLE_MODEL_PURPOSES = {
  chair: "framing_synthesis",
  strategist: "strategy_tradeoffs",
  skeptic: "risk_red_team",
  operator: "execution_planning",
  researcher: "fact_gap_analysis",
  user_advocate: "values_energy_fit",
  reflector: "retrospective_calibration"
};

export function envKeyForRole(prefix, roleId) {
  return `${prefix}_${roleId.toUpperCase()}`;
}

export function roleRouteFromEnv(roleId, env = process.env) {
  const provider =
    env[envKeyForRole("COUNCIL_PROVIDER", roleId)] ||
    env.COUNCIL_PROVIDER ||
    "auto";
  const model =
    env[envKeyForRole("COUNCIL_MODEL", roleId)] ||
    env.COUNCIL_MODEL ||
    "";

  return {
    roleId,
    provider: provider.toLowerCase(),
    model,
    selectionReason: ROLE_MODEL_PURPOSES[roleId] || "general_council_reasoning"
  };
}
