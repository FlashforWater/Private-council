import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createReadStream, existsSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  COUNCIL_ROLES,
  addCommitment,
  advanceSession,
  applyAgentOutput,
  askRole,
  canTransition,
  clarifyContext,
  createMockAgentOutput,
  createSession,
  ensureOptions,
  ensureRecommendation,
  nextPhase,
  recordDecision,
  rolesForPhase,
  runPhase,
  scheduleReview,
  updateCriterionWeight
} from "./src/domain.js";
import {
  buildAgentPrompt,
  normalizeStructuredOutput,
  parseJsonFromText,
  structuredAgentOutputSchema
} from "./src/llm.js";
import { aggregateClaims } from "./src/claimAggregator.js";
import { evaluateCrossValidationTrigger, summarizeCrossValidation } from "./src/crossValidation.js";
import { buildDefaultOptionsIfMissing, evaluateOptions } from "./src/evaluationEngine.js";
import { roleRouteFromEnv } from "./src/modelRouting.js";
import { proposeMemoryItems } from "./src/privacyGovernance.js";
import { buildReliabilityProfile, ensurePredictionRecords } from "./src/reliabilityEngine.js";
import { SessionStore } from "./src/sessionStore.js";
import { MemoryStore } from "./src/memoryStore.js";
import { allocateTurns } from "./src/turnAllocator.js";
import {
  addEvidenceItem,
  attachMemoryCandidateIds,
  completeRetrospective,
  generateDecisionReport,
  updateMemoryConsent
} from "./src/advancedWorkflows.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rootDir = resolve(__dirname);

await loadDotEnv();
const port = Number(process.env.PORT || 4173);
const dataPath = resolve(rootDir, process.env.COUNCIL_DATA_PATH || ".private-council-data/sessions.json");
const memoryPath = resolve(rootDir, process.env.COUNCIL_MEMORY_PATH || ".private-council-data/memory.json");
const store = new SessionStore(dataPath);
const memoryStore = new MemoryStore(memoryPath);

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if ((request.method === "GET" || request.method === "HEAD") && url.pathname === "/api/config") {
      if (request.method === "HEAD") {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end();
        return;
      }
      return sendJson(response, getPublicConfig());
    }

    if (request.method === "POST" && url.pathname === "/api/agent") {
      const body = await readJson(request);
      const result = await runAgent(body);
      return sendJson(response, result);
    }

    const memoryMatch = url.pathname.match(/^\/api\/memory(?:\/([^/]+))?$/);
    if (memoryMatch) {
      return handleMemoryRoute(request, response, memoryMatch);
    }

    const sessionMatch = url.pathname.match(/^\/api\/sessions(?:\/([^/]+)(?:\/([^/]+))?)?$/);
    if (sessionMatch) {
      return handleSessionRoute(request, response, sessionMatch);
    }

    if (request.method === "GET" || request.method === "HEAD") {
      return serveStatic(url.pathname, response, request.method === "HEAD");
    }

    response.writeHead(405, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Method not allowed" }));
  } catch (error) {
    response.writeHead(500, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: error.message || "Internal server error" }));
  }
});

server.listen(port, "127.0.0.1", () => {
  const config = getPublicConfig();
  console.log(`Private Council server running at http://127.0.0.1:${port}/`);
  console.log(`Agent provider: ${config.provider} (${config.model})`);
  console.log(`Session data: ${dataPath}`);
  console.log(`Memory data: ${memoryPath}`);
});

async function runAgent({ roleId, session, options = {} }) {
  const role = COUNCIL_ROLES.find((item) => item.id === roleId);
  if (!role || !session?.canvas) {
    throw new Error("Invalid agent request.");
  }

  const route = roleRouteFromEnv(roleId);
  const provider = resolveProvider(route.provider, route.model, roleId);
  if (provider.id === "mock") {
    return {
      provider: "local",
      model: "mock-agent-v1",
      fallback: true,
      selectionReason: route.selectionReason,
      output: createMockAgentOutput(roleId, session, options)
    };
  }

  const prompt = buildAgentPrompt({ role, session, options });
  try {
    const output = await provider.run(prompt);
    return {
      provider: provider.id,
      model: provider.model,
      fallback: false,
      selectionReason: route.selectionReason,
      output
    };
  } catch (error) {
    console.warn(`Agent provider failed, falling back to mock: ${error.message}`);
    return {
      provider: "local",
      model: "mock-agent-v1",
      fallback: true,
      selectionReason: route.selectionReason,
      error: error.message,
      output: createMockAgentOutput(roleId, session, options)
    };
  }
}

async function handleSessionRoute(request, response, match) {
  const sessionId = match[1] ? decodeURIComponent(match[1]) : null;
  const action = match[2] ? decodeURIComponent(match[2]) : null;

  if (!sessionId && !action && request.method === "GET") {
    return sendJson(response, await store.list());
  }

  if (!sessionId && !action && request.method === "POST") {
    const input = await readJson(request);
    const result = createSession(input);
    if (result.blocked) return sendJson(response, result, 422);
    const relevantMemory = await memoryStore.retrieveForText(
      [input.question, input.background, input.currentLeaning, input.constraints].join(" ")
    );
    result.session.canvas.retrievedMemory = relevantMemory;
    await store.upsert(result.session);
    return sendJson(response, result);
  }

  if (sessionId && !action && request.method === "GET") {
    const session = await store.get(sessionId);
    if (!session) return sendJson(response, { error: "Session not found" }, 404);
    return sendJson(response, session);
  }

  if (sessionId && action === "report" && (request.method === "GET" || request.method === "HEAD")) {
    const current = await store.get(sessionId);
    if (!current) return sendJson(response, { error: "Session not found" }, 404);
    response.writeHead(200, {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeFileName(current.title)}-decision-report.md"`
    });
    if (request.method === "HEAD") {
      response.end();
      return;
    }
    response.end(generateDecisionReport(current));
    return;
  }

  if (!sessionId || !action || request.method !== "POST") {
    return sendJson(response, { error: "Not found" }, 404);
  }

  const body = await readJson(request);
  const current = await store.get(sessionId);
  if (!current) return sendJson(response, { error: "Session not found" }, 404);

  const next = await applySessionAction(current, action, body);
  await store.upsert(next);
  return sendJson(response, next);
}

async function handleMemoryRoute(request, response, match) {
  const memoryId = match[1] ? decodeURIComponent(match[1]) : null;

  if (!memoryId && request.method === "GET") {
    return sendJson(response, await memoryStore.list());
  }

  if (memoryId && request.method === "DELETE") {
    return sendJson(response, { deleted: await memoryStore.remove(memoryId) });
  }

  return sendJson(response, { error: "Not found" }, 404);
}

async function applySessionAction(session, action, body) {
  switch (action) {
    case "run-phase":
      return runPhaseServerSide(session);
    case "advance":
      return advanceSessionServerSide(session);
    case "ask":
      return askRoleServerSide(session, body.roleId, body.prompt || "");
    case "clarify":
      return clarifyContext(session, body.text || "");
    case "criteria":
      return updateCriterionWeight(session, body.criterionId, body.weight);
    case "decision":
      return recordDecision(session, body);
    case "commitment":
      return addCommitment(session, body);
    case "review":
      return scheduleReview(session, body);
    case "evidence":
      return applyEngines(addEvidenceItem(session, body));
    case "memory":
      return updateMemoryServerSide(session, body);
    case "retrospective":
      return completeRetrospective(session, body);
    case "cross-validate":
      return crossValidateServerSide(session);
    default:
      throw new Error(`Unknown session action: ${action}`);
  }
}

async function updateMemoryServerSide(session, body) {
  const next = updateMemoryConsent(session, body);
  const latestDecision = next.canvas.memoryDecisions?.at(-1);
  if (latestDecision?.decision === "accepted") {
    await memoryStore.add({
      ...latestDecision.candidate,
      sourceSessionId: session.id,
      savedAt: latestDecision.decidedAt
    });
  }
  return next;
}

async function crossValidateServerSide(session) {
  const now = new Date();
  const roles = ["skeptic", "researcher", "operator"];
  let next = structuredClone(session);

  if (process.env.COUNCIL_FORCE_MOCK === "true") {
    for (const roleId of roles) {
      const output = createMockAgentOutput(roleId, next, {
        mode: "cross_validation",
        prompt: "Independently validate the recommendation, risks, evidence, and execution plan."
      });
      next = applyAgentOutput(next, roleId, output, now, {
        provider: "local",
        model: "mock-agent-v1",
        selectionReason: "manual_cross_validation",
        fallback: true
      });
    }
    return applyEngines(next);
  }

  for (const roleId of roles) {
    const result = await runAgent({
      roleId,
      session: next,
      options: {
        mode: "cross_validation",
        prompt: "Independently validate the recommendation, risks, evidence, and execution plan. Focus on unique findings and conflicts."
      }
    });
    next = applyAgentOutput(next, roleId, result.output, now, {
      provider: result.provider,
      model: result.model,
      selectionReason: result.selectionReason || "manual_cross_validation",
      fallback: result.fallback
    });
  }
  next.canvas.crossValidationManualRunAt = now.toISOString();
  return applyEngines({ ...next, updatedAt: now.toISOString() });
}

async function runPhaseServerSide(session) {
  const phase = session.currentPhase;
  const now = new Date();
  const triggerBefore = evaluateCrossValidationTrigger(session);
  const allocation = allocateTurns(session, phase, { crossValidationTrigger: triggerBefore });
  const roles = allocation.roleIds.length ? allocation.roleIds : rolesForPhase(phase);
  let next = structuredClone(session);

  if (process.env.COUNCIL_FORCE_MOCK === "true") {
    return applyEngines(runPhase(session, now));
  }

  for (const roleId of roles) {
    const result = await runAgent({ roleId, session: next, options: { mode: "phase" } });
    next = applyAgentOutput(next, roleId, result.output, now, {
      provider: result.provider,
      model: result.model,
      selectionReason: result.selectionReason,
      fallback: result.fallback
    });
  }

  if (phase === "evaluation") next = ensureOptions(next, now);
  if (phase === "recommendation") next = ensureRecommendation(next, now);
  next.canvas.turnAllocation = allocation;
  return applyEngines({ ...next, updatedAt: now.toISOString() });
}

async function advanceSessionServerSide(session) {
  if (process.env.COUNCIL_FORCE_MOCK === "true") {
    return advanceSession(session);
  }
  const phase = session.currentPhase;
  let next = await runPhaseServerSide(session);
  const target = nextPhase(phase);
  if (canTransition(phase, target)) next.currentPhase = target;
  return { ...next, updatedAt: new Date().toISOString() };
}

async function askRoleServerSide(session, roleId, prompt) {
  if (process.env.COUNCIL_FORCE_MOCK === "true") {
    return askRole(session, roleId, prompt);
  }
  const role = COUNCIL_ROLES.find((item) => item.id === roleId);
  if (!role) throw new Error(`Unknown role: ${roleId}`);

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

  const result = await runAgent({
    roleId,
    session: next,
    options: { mode: roleId === "skeptic" ? "challenge" : "ask", prompt }
  });
  next = applyAgentOutput(next, roleId, result.output, now, {
    provider: result.provider,
    model: result.model,
    selectionReason: result.selectionReason,
    fallback: result.fallback
  });
  return { ...next, updatedAt: now.toISOString() };
}

function applyEngines(session) {
  const next = structuredClone(session);
  const aggregation = aggregateClaims(next.canvas);
  next.canvas.claims = aggregation.claims;
  next.canvas.assumptions = aggregation.assumptions;
  next.canvas.risks = aggregation.risks;
  next.canvas.claimGraph = aggregation.claimGraph;
  next.canvas.disagreementPanel = aggregation.disagreementPanel;
  next.canvas.fragileAssumptions = aggregation.fragileAssumptions;
  next.canvas.topRisks = aggregation.topRisks;

  next.canvas.crossValidationTrigger = evaluateCrossValidationTrigger(next);
  next.canvas.crossValidationResult = summarizeCrossValidation(next);

  next.canvas.options = buildDefaultOptionsIfMissing(next.canvas);
  next.canvas.evaluation = evaluateOptions(next.canvas.options, next.canvas.criteria);
  next.canvas.predictions = ensurePredictionRecords(next);
  next.canvas.reliabilityProfile = buildReliabilityProfile(next);
  next.canvas.memoryCandidates = proposeMemoryItems(next);
  return attachMemoryCandidateIds(next);
}

function resolveProvider(requestedProvider, requestedModel, roleId = "chair") {
  const requested = String(requestedProvider || "auto").toLowerCase();
  const providers = {
    openai: openaiProvider,
    anthropic: anthropicProvider,
    gemini: geminiProvider,
    deepseek: deepseekProvider
  };

  if (requested !== "auto" && requested !== "mock") {
    const provider = providers[requested]?.(requestedModel, roleId);
    return provider || mockProvider();
  }

  if (requested === "mock") return mockProvider();
  return (
    openaiProvider(requestedModel, roleId) ||
    anthropicProvider(requestedModel, roleId) ||
    geminiProvider(requestedModel, roleId) ||
    deepseekProvider(requestedModel, roleId) ||
    mockProvider()
  );
}

function getPublicConfig() {
  const provider = resolveProvider(process.env.COUNCIL_PROVIDER || "auto", process.env.COUNCIL_MODEL || "", "chair");
  return {
    available: provider.id !== "mock",
    provider: provider.id === "mock" ? "mock" : provider.id,
    model: provider.model,
    providers: [
      { id: "openai", configured: Boolean(process.env.OPENAI_API_KEY), model: process.env.OPENAI_MODEL || "" },
      { id: "anthropic", configured: Boolean(process.env.ANTHROPIC_API_KEY), model: process.env.ANTHROPIC_MODEL || "" },
      { id: "gemini", configured: Boolean(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY), model: process.env.GEMINI_MODEL || "" },
      { id: "deepseek", configured: Boolean(process.env.DEEPSEEK_API_KEY), model: process.env.DEEPSEEK_MODEL || "" }
    ],
    roleRoutes: COUNCIL_ROLES.map((role) => roleRouteFromEnv(role.id)),
    message:
      provider.id === "mock"
        ? "No configured model provider found. The app will use mock agents."
        : "Model provider configured. API keys stay on the local server."
  };
}

function mockProvider() {
  return { id: "mock", model: "mock-agent-v1" };
}

function openaiProvider(requestedModel) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const model = requestedModel || process.env.OPENAI_MODEL || process.env.COUNCIL_MODEL || "gpt-5.1-mini";
  return {
    id: "openai",
    model,
    run: async ({ system, user }) => {
      const data = await postJson(
        "https://api.openai.com/v1/responses",
        {
          model,
          input: [
            { role: "system", content: [{ type: "input_text", text: system }] },
            { role: "user", content: [{ type: "input_text", text: user }] }
          ],
          text: {
            format: {
              type: "json_schema",
              name: "structured_agent_output",
              strict: true,
              schema: structuredAgentOutputSchema
            }
          }
        },
        {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      );
      return normalizeStructuredOutput(parseProviderText(data));
    }
  };
}

function anthropicProvider(requestedModel) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const model = requestedModel || process.env.ANTHROPIC_MODEL || process.env.COUNCIL_MODEL || "claude-sonnet-4-5";
  return {
    id: "anthropic",
    model,
    run: async ({ system, user }) => {
      const data = await postJson(
        "https://api.anthropic.com/v1/messages",
        {
          model,
          max_tokens: 1200,
          system,
          messages: [{ role: "user", content: user }]
        },
        {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json"
        }
      );
      return normalizeStructuredOutput(parseProviderText(data));
    }
  };
}

function geminiProvider(requestedModel) {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const model = requestedModel || process.env.GEMINI_MODEL || process.env.COUNCIL_MODEL || "gemini-2.5-flash";
  return {
    id: "gemini",
    model,
    run: async ({ system, user }) => {
      const data = await postJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: structuredAgentOutputSchema
          }
        },
        { "Content-Type": "application/json" }
      );
      return normalizeStructuredOutput(parseProviderText(data));
    }
  };
}

function deepseekProvider(requestedModel) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;
  const model = requestedModel || process.env.DEEPSEEK_MODEL || process.env.COUNCIL_MODEL || "deepseek-chat";
  return {
    id: "deepseek",
    model,
    run: async ({ system, user }) => {
      const data = await postJson(
        "https://api.deepseek.com/chat/completions",
        {
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user }
          ],
          response_format: { type: "json_object" }
        },
        {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      );
      return normalizeStructuredOutput(parseProviderText(data));
    }
  };
}

async function postJson(url, body, headers) {
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Provider HTTP ${response.status}: ${text.slice(0, 400)}`);
  }
  return JSON.parse(text);
}

function parseProviderText(data) {
  if (typeof data.output_text === "string") return parseJsonFromText(data.output_text);

  const openAiText = data.output
    ?.flatMap((item) => item.content || [])
    .map((item) => item.text || item.value || "")
    .filter(Boolean)
    .join("\n");
  if (openAiText) return parseJsonFromText(openAiText);

  const anthropicText = data.content
    ?.map((item) => item.text || "")
    .filter(Boolean)
    .join("\n");
  if (anthropicText) return parseJsonFromText(anthropicText);

  const geminiText = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .filter(Boolean)
    .join("\n");
  if (geminiText) return parseJsonFromText(geminiText);

  const chatText = data.choices?.[0]?.message?.content;
  if (chatText) return parseJsonFromText(chatText);

  throw new Error("Could not find model text in provider response.");
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function sendJson(response, data, status = 200) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(data));
}

async function serveStatic(pathname, response, headOnly) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = normalize(join(rootDir, safePath));
  if (!filePath.startsWith(rootDir) || !existsSync(filePath)) {
    response.writeHead(404, { "Content-Type": "text/plain" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, { "Content-Type": mimeType(filePath) });
  if (headOnly) {
    response.end();
    return;
  }
  createReadStream(filePath).pipe(response);
}

function mimeType(filePath) {
  return (
    {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".md": "text/markdown; charset=utf-8"
    }[extname(filePath)] || "application/octet-stream"
  );
}

async function loadDotEnv() {
  const envPath = join(rootDir, ".env");
  if (!existsSync(envPath)) return;

  const source = await readFile(envPath, "utf8");
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function makeId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function safeFileName(value) {
  return String(value || "private-council")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "private-council";
}
