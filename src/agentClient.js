import {
  applyAgentOutput,
  canTransition,
  createMockAgentOutput,
  ensureOptions,
  ensureRecommendation,
  nextPhase,
  rolesForPhase
} from "./domain.js";

export async function getAgentConfig() {
  try {
    const response = await fetch("/api/config");
    if (!response.ok) throw new Error(`Config request failed: ${response.status}`);
    return await response.json();
  } catch {
    return {
      available: false,
      provider: "mock",
      model: "mock-agent-v1",
      providers: [],
      message: "API server unavailable; using browser mock mode."
    };
  }
}

export async function runPhaseWithAdapter(session) {
  const phase = session.currentPhase;
  const roles = rolesForPhase(phase);
  const now = new Date();
  let next = structuredClone(session);

  for (const roleId of roles) {
    const result = await runAgent(roleId, next, { mode: "phase" });
    next = applyAgentOutput(next, roleId, result.output, now, {
      provider: result.provider,
      model: result.model
    });
  }

  if (phase === "evaluation") {
    next = ensureOptions(next, now);
  }

  if (phase === "recommendation") {
    next = ensureRecommendation(next, now);
  }

  return stamp(next, now);
}

export async function advanceSessionWithAdapter(session) {
  const phase = session.currentPhase;
  let next = await runPhaseWithAdapter(session);
  const target = nextPhase(phase);
  if (canTransition(phase, target)) {
    next.currentPhase = target;
  }
  return stamp(next, new Date());
}

export async function askRoleWithAdapter(session, roleId, prompt) {
  const now = new Date();
  let next = structuredClone(session);
  next.transcript.push({
    id: makeId("msg"),
    speaker: "user",
    roleId: "user",
    phase: next.currentPhase,
    content: prompt.trim(),
    createdAt: now.toISOString()
  });

  const result = await runAgent(roleId, next, {
    mode: roleId === "skeptic" ? "challenge" : "ask",
    prompt
  });

  next = applyAgentOutput(next, roleId, result.output, now, {
    provider: result.provider,
    model: result.model
  });
  return stamp(next, now);
}

async function runAgent(roleId, session, options) {
  try {
    const response = await fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleId, session, options })
    });

    if (!response.ok) {
      throw new Error(`Agent request failed: ${response.status}`);
    }

    const data = await response.json();
    if (!data?.output?.summary) {
      throw new Error("Agent response did not include structured output.");
    }
    return data;
  } catch {
    return {
      provider: "local",
      model: "mock-agent-v1",
      fallback: true,
      output: createMockAgentOutput(roleId, session, options)
    };
  }
}

function stamp(session, now) {
  return { ...session, updatedAt: now.toISOString() };
}

function makeId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
