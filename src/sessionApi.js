import {
  addCommitment,
  advanceSession,
  askRole,
  clarifyContext,
  createSession,
  recordDecision,
  runPhase,
  scheduleReview,
  updateCriterionWeight
} from "./domain.js";

export async function loadServerSessions() {
  return request("/api/sessions", {}, () => []);
}

export async function createServerSession(input) {
  return request(
    "/api/sessions",
    {
      method: "POST",
      body: JSON.stringify(input)
    },
    () => createSession(input)
  );
}

export async function deleteServerSession(sessionId) {
  return request(
    `/api/sessions/${encodeURIComponent(sessionId)}`,
    { method: "DELETE" },
    () => ({ deleted: false })
  );
}

export async function runServerPhase(session) {
  return request(
    `/api/sessions/${encodeURIComponent(session.id)}/run-phase`,
    {
      method: "POST",
      body: JSON.stringify({ locale: session.locale })
    },
    () => runPhase(session)
  );
}

export async function advanceServerSession(session) {
  return request(
    `/api/sessions/${encodeURIComponent(session.id)}/advance`,
    {
      method: "POST",
      body: JSON.stringify({ locale: session.locale })
    },
    () => advanceSession(session)
  );
}

export async function autoRunServerSession(session) {
  return request(
    `/api/sessions/${encodeURIComponent(session.id)}/auto-run`,
    {
      method: "POST",
      body: JSON.stringify({ locale: session.locale })
    },
    () => session
  );
}

export async function askServerRole(session, roleId, prompt) {
  return request(
    `/api/sessions/${encodeURIComponent(session.id)}/ask`,
    {
      method: "POST",
      body: JSON.stringify({ roleId, prompt, locale: session.locale })
    },
    () => askRole(session, roleId, prompt)
  );
}

export async function clarifyServerContext(session, text) {
  return request(
    `/api/sessions/${encodeURIComponent(session.id)}/clarify`,
    {
      method: "POST",
      body: JSON.stringify({ text })
    },
    () => clarifyContext(session, text)
  );
}

export async function updateServerCriterion(session, criterionId, weight) {
  return request(
    `/api/sessions/${encodeURIComponent(session.id)}/criteria`,
    {
      method: "POST",
      body: JSON.stringify({ criterionId, weight })
    },
    () => updateCriterionWeight(session, criterionId, weight)
  );
}

export async function recordServerDecision(session, input) {
  return request(
    `/api/sessions/${encodeURIComponent(session.id)}/decision`,
    {
      method: "POST",
      body: JSON.stringify(input)
    },
    () => recordDecision(session, input)
  );
}

export async function addServerCommitment(session, input) {
  return request(
    `/api/sessions/${encodeURIComponent(session.id)}/commitment`,
    {
      method: "POST",
      body: JSON.stringify(input)
    },
    () => addCommitment(session, input)
  );
}

export async function scheduleServerReview(session, input) {
  return request(
    `/api/sessions/${encodeURIComponent(session.id)}/review`,
    {
      method: "POST",
      body: JSON.stringify(input)
    },
    () => scheduleReview(session, input)
  );
}

export async function addServerEvidence(session, input) {
  return request(
    `/api/sessions/${encodeURIComponent(session.id)}/evidence`,
    {
      method: "POST",
      body: JSON.stringify(input)
    },
    () => session
  );
}

export async function updateServerMemory(session, input) {
  return request(
    `/api/sessions/${encodeURIComponent(session.id)}/memory`,
    {
      method: "POST",
      body: JSON.stringify(input)
    },
    () => session
  );
}

export async function completeServerRetrospective(session, input) {
  return request(
    `/api/sessions/${encodeURIComponent(session.id)}/retrospective`,
    {
      method: "POST",
      body: JSON.stringify(input)
    },
    () => session
  );
}

export async function crossValidateServerSession(session) {
  return request(
    `/api/sessions/${encodeURIComponent(session.id)}/cross-validate`,
    {
      method: "POST",
      body: JSON.stringify({ locale: session.locale })
    },
    () => session
  );
}

export function reportUrl(session) {
  return `/api/sessions/${encodeURIComponent(session.id)}/report`;
}

export async function loadServerMemory() {
  return request("/api/memory", {}, () => []);
}

export async function deleteServerMemory(memoryId) {
  return request(
    `/api/memory/${encodeURIComponent(memoryId)}`,
    { method: "DELETE" },
    () => ({ deleted: false })
  );
}

async function request(path, options = {}, fallback) {
  try {
    const response = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...options
    });
    const data = await response.json();
    if (!response.ok) return data;
    return data;
  } catch {
    return fallback();
  }
}
