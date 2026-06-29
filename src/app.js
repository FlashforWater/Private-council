import {
  COUNCIL_ROLES,
  PHASE_LABELS,
  SESSION_PHASES,
  nextPhase,
  rankOptions
} from "./domain.js";
import { getAgentConfig } from "./agentClient.js";
import {
  addServerCommitment,
  addServerEvidence,
  advanceServerSession,
  askServerRole,
  clarifyServerContext,
  completeServerRetrospective,
  crossValidateServerSession,
  createServerSession,
  deleteServerMemory,
  loadServerMemory,
  loadServerSessions,
  recordServerDecision,
  reportUrl,
  runServerPhase,
  scheduleServerReview,
  updateServerMemory,
  updateServerCriterion
} from "./sessionApi.js";

const app = document.querySelector("#app");

const state = {
  sessions: [],
  memories: [],
  activeId: null,
  activeTab: "council",
  draft: {
    question: "",
    background: "",
    currentLeaning: "",
    timeHorizon: "",
    emotionalState: "",
    constraints: ""
  },
  ui: {
    loading: false,
    apiConfig: {
      available: false,
      provider: "mock",
      model: "mock-agent-v1",
      message: "Checking agent provider..."
    },
    safeRoute: null,
    askRoleId: "chair",
    askPrompt: "",
    clarifyText: "",
    decisionChoice: "",
    decisionRationale: "",
    commitmentAction: "",
    commitmentSuccess: "",
    commitmentDue: "",
    reviewDate: "",
    reviewTrigger: "",
    evidenceText: "",
    evidenceSource: "",
    evidenceUrl: "",
    evidenceQuality: "medium",
    retrospectiveOutcome: "",
    retrospectiveHappened: "",
    retrospectiveAssumptions: "",
    retrospectiveLesson: ""
  }
};

render();
refreshSessions();
refreshAgentConfig();
refreshMemory();

function getActiveSession() {
  return state.sessions.find((session) => session.id === state.activeId) || null;
}

function setSession(session) {
  const index = state.sessions.findIndex((item) => item.id === session.id);
  if (index >= 0) {
    state.sessions[index] = session;
  } else {
    state.sessions.unshift(session);
  }
  state.sessions.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  state.activeId = session.id;
  render();
}

function setLoading(loading) {
  state.ui.loading = loading;
  render();
}

async function refreshAgentConfig() {
  state.ui.apiConfig = await getAgentConfig();
  render();
}

async function refreshSessions() {
  const sessions = await loadServerSessions();
  state.sessions = Array.isArray(sessions) ? sessions : [];
  if (!state.activeId && state.sessions.length > 0) {
    state.activeId = state.sessions[0].id;
  }
  render();
}

async function refreshMemory() {
  const memories = await loadServerMemory();
  state.memories = Array.isArray(memories) ? memories : [];
  render();
}

function render() {
  const session = getActiveSession();
  app.innerHTML = `
    <div class="shell">
      ${renderSidebar(session)}
      <main class="workspace">
        ${renderMobileTabs()}
        <section class="panel council-panel ${state.activeTab === "council" ? "is-active" : ""}">
          ${session ? renderCouncil(session) : renderEmptyCouncil()}
        </section>
        <aside class="panel canvas-panel ${state.activeTab === "canvas" ? "is-active" : ""}">
          ${session ? renderCanvas(session) : renderEmptyCanvas()}
        </aside>
      </main>
      <footer class="action-dock ${state.activeTab === "decision" ? "is-active" : ""}">
        ${session ? renderActions(session) : renderStartHint()}
      </footer>
    </div>
  `;
  bindEvents();
}

function renderSidebar(session) {
  return `
    <aside class="sidebar">
      <div class="brand">
        <div class="mark">PC</div>
        <div>
          <h1>Private Council</h1>
          <p>Structured decisions, not open-ended chat.</p>
        </div>
      </div>

      ${renderProviderStatus()}

      <form class="new-session" data-action="create-session">
        <label>
          Decision question
          <textarea name="question" rows="3" placeholder="Should I quit my job to work on my AI product?">${escapeHtml(state.draft.question)}</textarea>
        </label>
        <label>
          Background
          <textarea name="background" rows="4" placeholder="What matters, what happened, and what options are visible?">${escapeHtml(state.draft.background)}</textarea>
        </label>
        <label>
          Current leaning
          <input name="currentLeaning" value="${escapeHtml(state.draft.currentLeaning)}" placeholder="I am leaning toward..." />
        </label>
        <div class="field-grid">
          <label>
            Time horizon
            <input name="timeHorizon" value="${escapeHtml(state.draft.timeHorizon)}" placeholder="2 weeks, 6 months..." />
          </label>
          <label>
            Emotional state
            <input name="emotionalState" value="${escapeHtml(state.draft.emotionalState)}" placeholder="Excited, anxious..." />
          </label>
        </div>
        <label>
          Constraints
          <textarea name="constraints" rows="2" placeholder="Money, time, family, legal boundaries...">${escapeHtml(state.draft.constraints)}</textarea>
        </label>
        <button class="primary" type="submit">Start council</button>
      </form>

      ${state.ui.safeRoute ? renderSafeRoute(state.ui.safeRoute) : ""}

      <div class="session-list">
        ${renderDueReviews()}
        <div class="section-title">Sessions</div>
        ${
          state.sessions.length
            ? state.sessions
                .map(
                  (item) => `
                    <button class="session-item ${session?.id === item.id ? "selected" : ""}" data-session-id="${item.id}">
                      <span>${escapeHtml(item.title)}</span>
                      <small>${PHASE_LABELS[item.currentPhase]} · ${escapeHtml(item.status)}</small>
                    </button>
                  `
                )
                .join("")
            : `<p class="muted">No sessions yet.</p>`
        }
      </div>
      ${renderMemoryLibrary()}
    </aside>
  `;
}

function renderDueReviews() {
  const today = new Date().toISOString().slice(0, 10);
  const due = state.sessions.filter((session) => {
    const date = session.canvas?.reviewPlan?.reviewDate;
    return date && date <= today && session.status === "scheduled_for_review";
  });
  if (!due.length) return "";
  return `
    <div class="due-reviews">
      <div class="section-title">Due Reviews</div>
      ${due
        .map(
          (session) => `
            <button class="session-item" data-session-id="${session.id}">
              <span>${escapeHtml(session.title)}</span>
              <small>${escapeHtml(session.canvas.reviewPlan.reviewDate)}</small>
            </button>
          `
        )
        .join("")}
    </div>
  `;
}

function renderMemoryLibrary() {
  return `
    <div class="memory-library">
      <div class="section-title">Memory</div>
      ${
        state.memories.length
          ? state.memories
              .slice(0, 6)
              .map(
                (memory) => `
                  <article class="memory-item">
                    <span>${escapeHtml(memory.text)}</span>
                    <small>${escapeHtml(memory.type)} · ${escapeHtml(memory.sensitivity)}</small>
                    <button data-action="delete-memory" data-memory-id="${escapeHtml(memory.id)}">Delete</button>
                  </article>
                `
              )
              .join("")
          : `<p class="muted">No saved memory.</p>`
      }
    </div>
  `;
}

function renderProviderStatus() {
  const config = state.ui.apiConfig;
  return `
    <div class="provider-status ${config.available ? "live" : ""}">
      <div>
        <strong>${escapeHtml(config.provider)}</strong>
        <span>${escapeHtml(config.model)}</span>
      </div>
      <small>${escapeHtml(config.message)}</small>
    </div>
  `;
}

function renderMobileTabs() {
  return `
    <nav class="mobile-tabs" aria-label="Workspace tabs">
      ${["council", "canvas", "decision"]
        .map(
          (tab) => `
            <button class="${state.activeTab === tab ? "selected" : ""}" data-tab="${tab}">
              ${capitalize(tab)}
            </button>
          `
        )
        .join("")}
    </nav>
  `;
}

function renderCouncil(session) {
  return `
    <div class="panel-header">
      <div>
        <div class="eyebrow">Council Room</div>
        <h2>${escapeHtml(session.title)}</h2>
      </div>
      <span class="status-pill">${PHASE_LABELS[session.currentPhase]}</span>
    </div>
    ${renderPhaseRail(session)}
    <div class="role-grid">
      ${COUNCIL_ROLES.map((role) => renderRoleCard(role, session)).join("")}
    </div>
    <div class="transcript">
      <div class="section-title">Transcript</div>
      ${session.transcript
        .slice()
        .reverse()
        .map((message) => renderMessage(message))
        .join("")}
    </div>
  `;
}

function renderPhaseRail(session) {
  const currentIndex = SESSION_PHASES.indexOf(session.currentPhase);
  return `
    <ol class="phase-rail">
      ${SESSION_PHASES.slice(1, -1)
        .map((phase) => {
          const index = SESSION_PHASES.indexOf(phase);
          const className = index < currentIndex ? "done" : index === currentIndex ? "current" : "";
          return `<li class="${className}"><span></span>${PHASE_LABELS[phase]}</li>`;
        })
        .join("")}
    </ol>
  `;
}

function renderRoleCard(role, session) {
  const lastRun = session.agentRuns
    .slice()
    .reverse()
    .find((run) => run.roleId === role.id);
  const active = session.transcript[session.transcript.length - 1]?.roleId === role.id;
  const stateLabel = active ? "speaking" : lastRun ? "idle" : "waiting";

  return `
    <article class="role-card ${active ? "active" : ""}">
      <div class="role-top">
        <span class="avatar ${role.color}">${role.name.slice(0, 1)}</span>
        <div>
          <h3>${role.name}</h3>
          <small>${stateLabel}</small>
        </div>
      </div>
      <p>${escapeHtml(lastRun?.output.summary || role.purpose)}</p>
    </article>
  `;
}

function renderMessage(message) {
  const role = COUNCIL_ROLES.find((item) => item.id === message.roleId);
  return `
    <article class="message ${message.roleId === "user" ? "from-user" : ""}">
      <div class="message-meta">
        <strong>${escapeHtml(message.speaker)}</strong>
        <span>${PHASE_LABELS[message.phase] || message.phase}</span>
      </div>
      <p>${escapeHtml(message.content)}</p>
      ${role ? `<small>${escapeHtml(role.purpose)}</small>` : ""}
    </article>
  `;
}

function renderCanvas(session) {
  const canvas = session.canvas;
  const rankedOptions = rankOptions(canvas.options, canvas.criteria);
  return `
    <div class="panel-header">
      <div>
        <div class="eyebrow">Decision Canvas</div>
        <h2>Traceable record</h2>
      </div>
      <span class="status-pill">${canvas.humanDecision ? "decided" : "forming"}</span>
    </div>

    ${renderCanvasSection("Problem", renderProblem(canvas))}
    ${renderCanvasSection("Retrieved Memory", renderRetrievedMemory(canvas.retrievedMemory))}
    ${renderCanvasSection("Protocol", renderProtocol(canvas))}
    ${renderCanvasSection("Options", renderOptions(rankedOptions))}
    ${renderCanvasSection("Criteria", renderCriteria(canvas.criteria))}
    ${renderCanvasSection("Evaluation", renderEvaluation(canvas.evaluation))}
    ${renderCanvasSection("Key Claims", renderList(canvas.claims.slice(-8), "text", "No claims yet."))}
    ${renderCanvasSection("Assumptions", renderList(canvas.assumptions.slice(-8), "text", "No assumptions yet."))}
    ${renderCanvasSection("Risks", renderRisks(canvas.risks.slice(-8)))}
    ${renderCanvasSection("Evidence", renderEvidence(canvas.evidence))}
    ${renderCanvasSection("Disagreements", renderDisagreements(canvas))}
    ${renderCanvasSection("Cross-Validation", renderCrossValidation(canvas))}
    ${renderCanvasSection("Recommendation", renderRecommendation(canvas.recommendation))}
    ${renderCanvasSection("Human Decision", renderHumanDecision(canvas.humanDecision))}
    ${renderCanvasSection("Review Plan", renderReviewPlan(canvas.reviewPlan))}
    ${renderCanvasSection("Reliability", renderReliability(canvas.reliabilityProfile))}
    ${renderCanvasSection("Memory Candidates", renderMemoryCandidates(canvas.memoryCandidates))}
  `;
}

function renderCanvasSection(title, body) {
  return `
    <details class="canvas-section" open>
      <summary>${title}</summary>
      ${body}
    </details>
  `;
}

function renderProblem(canvas) {
  return `
    <div class="stack">
      <p><strong>Original:</strong> ${escapeHtml(canvas.problem.originalQuestion)}</p>
      <p><strong>Refined:</strong> ${escapeHtml(canvas.problem.refinedQuestion || "Pending Chair framing.")}</p>
      <p><strong>Time:</strong> ${escapeHtml(canvas.problem.timeHorizon || "Not set")}</p>
      <p><strong>Leaning:</strong> ${escapeHtml(canvas.context.currentLeaning || "Not set")}</p>
      <p><strong>Energy:</strong> ${escapeHtml(canvas.emotionalContext?.state || "Not set")}</p>
    </div>
  `;
}

function renderRetrievedMemory(memories) {
  if (!memories?.length) return `<p class="muted">No prior memory matched this session.</p>`;
  return `
    <ul class="dense-list">
      ${memories
        .map(
          (memory) => `
            <li>
              <span>${escapeHtml(memory.text)}</span>
              <small>${escapeHtml(memory.type)} · relevance ${escapeHtml(memory.relevance)}</small>
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

function renderOptions(rankedOptions) {
  if (!rankedOptions.length) return `<p class="muted">Options will appear during evaluation.</p>`;
  return `
    <div class="option-list">
      ${rankedOptions
        .map(
          ({ option, score }) => `
            <article class="option-row">
              <div>
                <strong>${escapeHtml(option.title)}</strong>
                <p>${escapeHtml(option.description)}</p>
              </div>
              <span>${score}</span>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderProtocol(canvas) {
  const route = canvas.protocolRoute;
  const allocation = canvas.turnAllocation;
  if (!route) return `<p class="muted">Protocol will be selected when a session starts.</p>`;
  return `
    <div class="stack">
      <p><strong>${escapeHtml(route.decisionType)}</strong> · ${escapeHtml(route.protocol)}</p>
      <p>${escapeHtml(route.rationale)}</p>
      <p><strong>Council:</strong> ${escapeHtml((route.councilComposition || []).join(", "))}</p>
      ${allocation ? `<p><strong>Current turns:</strong> ${escapeHtml(allocation.roleIds.join(", "))}</p>` : ""}
    </div>
  `;
}

function renderCriteria(criteria) {
  return `
    <div class="criteria-list">
      ${criteria
        .map(
          (criterion) => `
            <label class="criterion">
              <span>${escapeHtml(criterion.name)}</span>
              <input type="range" min="1" max="5" value="${criterion.weight}" data-criterion-id="${criterion.id}" />
              <strong>${criterion.weight}</strong>
            </label>
          `
        )
        .join("")}
    </div>
  `;
}

function renderEvaluation(evaluation) {
  if (!evaluation?.rows?.length) return `<p class="muted">Evaluation appears after options are available.</p>`;
  return `
    <div class="option-list">
      ${evaluation.rows
        .map(
          (row) => `
            <article class="option-row">
              <div>
                <strong>${escapeHtml(row.optionTitle)}</strong>
                <p>${escapeHtml(row.weakestCriteria.length ? `Weakest: ${row.weakestCriteria.join(", ")}` : "No weak criteria under current scores.")}</p>
              </div>
              <span>${row.normalizedScore}</span>
            </article>
          `
        )
        .join("")}
      <p class="muted">${escapeHtml(evaluation.sensitivity?.interpretation || "")}</p>
    </div>
  `;
}

function renderRisks(risks) {
  if (!risks.length) return `<p class="muted">No risks recorded yet.</p>`;
  return `
    <ul class="dense-list">
      ${risks
        .map(
          (risk) => `
            <li>
              <span>${escapeHtml(risk.text)}</span>
              <small>${escapeHtml(risk.likelihood)} likelihood · ${escapeHtml(risk.impact)} impact</small>
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

function renderEvidence(evidence) {
  if (!evidence?.length) return `<p class="muted">No evidence recorded yet.</p>`;
  return `
    <ul class="dense-list">
      ${evidence
        .slice(-8)
        .map(
          (item) => `
            <li>
              <span>${escapeHtml(item.text)}</span>
              <small>${escapeHtml(item.source || "user")} · ${escapeHtml(item.quality || "medium")}${item.url ? ` · ${escapeHtml(item.url)}` : ""}</small>
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

function renderDisagreements(canvas) {
  const panel = canvas.disagreementPanel || canvas.claims.filter((claim) => claim.stance === "challenge" || claim.stance === "caution");
  return renderList(panel.slice(-6), "text", "Challenges and minority views will appear here.");
}

function renderCrossValidation(canvas) {
  const trigger = canvas.crossValidationTrigger;
  const result = canvas.crossValidationResult;
  if (!trigger) return `<p class="muted">Cross-validation has not been evaluated yet.</p>`;
  return `
    <div class="stack">
      <p><strong>${trigger.shouldValidate ? "Triggered" : "Not triggered"}</strong> · ${escapeHtml(trigger.severity)}</p>
      <p><strong>Reasons:</strong> ${escapeHtml(trigger.reasons?.join(", ") || "none")}</p>
      <p><strong>Status:</strong> ${escapeHtml(result?.status || "pending")}</p>
      <p><strong>Minority opinions:</strong> ${escapeHtml(result?.minorityOpinions?.join(" | ") || "none")}</p>
    </div>
  `;
}

function renderRecommendation(recommendation) {
  if (!recommendation) return `<p class="muted">No recommendation yet.</p>`;
  return `
    <div class="stack">
      <p><strong>${escapeHtml(recommendation.optionTitle)}</strong> · ${escapeHtml(recommendation.confidence)} confidence</p>
      <p>${escapeHtml(recommendation.rationale)}</p>
      <p><strong>Next action:</strong> ${escapeHtml(recommendation.minimumNextAction)}</p>
      <p><strong>Review:</strong> ${escapeHtml(recommendation.reviewTiming)}</p>
    </div>
  `;
}

function renderHumanDecision(decision) {
  if (!decision) return `<p class="muted">The user has not decided yet.</p>`;
  return `
    <div class="stack">
      <p><strong>${escapeHtml(decision.label)}</strong></p>
      <p>${escapeHtml(decision.rationale || "No rationale provided.")}</p>
    </div>
  `;
}

function renderReviewPlan(reviewPlan) {
  if (!reviewPlan) return `<p class="muted">No review scheduled yet.</p>`;
  return `
    <div class="stack">
      <p><strong>Date:</strong> ${escapeHtml(reviewPlan.reviewDate || "Trigger-based")}</p>
      <p><strong>Trigger:</strong> ${escapeHtml(reviewPlan.trigger || "Not set")}</p>
    </div>
  `;
}

function renderReliability(profile) {
  if (!profile) return `<p class="muted">Reliability profile appears after agent runs.</p>`;
  return `
    <div class="stack">
      <p>${escapeHtml(profile.note)}</p>
      <p><strong>Roles:</strong> ${escapeHtml((profile.roles || []).map((role) => `${role.id}:${role.runs}`).join(", ") || "none")}</p>
      <p><strong>Models:</strong> ${escapeHtml((profile.models || []).map((model) => `${model.id}:${model.runs}`).join(", ") || "none")}</p>
    </div>
  `;
}

function renderMemoryCandidates(items) {
  if (!items?.length) return `<p class="muted">No memory candidates yet.</p>`;
  return `
    <ul class="dense-list">
      ${items
        .map(
          (item) => `
            <li>
              <span>${escapeHtml(item.text)}</span>
              <small>${escapeHtml(item.type)} · ${escapeHtml(item.sensitivity)} sensitivity · ${item.requiresConsent ? "consent needed" : "session record"}</small>
              <div class="button-row">
                <button data-action="memory-accept" data-memory-id="${escapeHtml(item.id)}">Save</button>
                <button data-action="memory-reject" data-memory-id="${escapeHtml(item.id)}">Reject</button>
              </div>
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

function renderActions(session) {
  const recommendation = session.canvas.recommendation;
  const choices = session.canvas.options
    .map((option) => `<option value="${option.id}">${escapeHtml(option.title)}</option>`)
    .join("");
  return `
    <div class="dock-grid">
      <section class="dock-card">
        <div class="section-title">Meeting controls</div>
        <div class="button-row">
          <button class="primary" data-action="continue" ${state.ui.loading ? "disabled" : ""}>${state.ui.loading ? "Working..." : "Continue"}</button>
          <button data-action="run-phase" ${state.ui.loading ? "disabled" : ""}>Run current phase</button>
          <button data-action="challenge" ${state.ui.loading ? "disabled" : ""}>Challenge this</button>
          <button data-action="cross-validate" ${state.ui.loading ? "disabled" : ""}>Cross-validate</button>
          <button data-action="recommend" ${state.ui.loading ? "disabled" : ""}>Generate recommendation</button>
          <a class="button-link" href="${reportUrl(session)}" target="_blank" rel="noreferrer">Export report</a>
        </div>
        <p class="muted">Next phase: ${PHASE_LABELS[nextPhase(session.currentPhase)]}</p>
      </section>

      <section class="dock-card">
        <div class="section-title">Evidence</div>
        <div class="inline-form">
          <input data-field="evidenceText" value="${escapeHtml(state.ui.evidenceText)}" placeholder="Evidence or source note..." />
          <input data-field="evidenceSource" value="${escapeHtml(state.ui.evidenceSource)}" placeholder="Source..." />
          <select data-field="evidenceQuality">
            ${["low", "medium", "high"].map((quality) => `<option value="${quality}" ${state.ui.evidenceQuality === quality ? "selected" : ""}>${quality}</option>`).join("")}
          </select>
          <button data-action="add-evidence">Add</button>
        </div>
        <input data-field="evidenceUrl" value="${escapeHtml(state.ui.evidenceUrl)}" placeholder="Optional URL..." />
      </section>

      <section class="dock-card">
        <div class="section-title">Ask or clarify</div>
        <div class="inline-form">
          <select data-field="askRoleId">
            ${COUNCIL_ROLES.filter((role) => role.id !== "reflector")
              .map(
                (role) =>
                  `<option value="${role.id}" ${state.ui.askRoleId === role.id ? "selected" : ""}>${role.name}</option>`
              )
              .join("")}
          </select>
          <input data-field="askPrompt" value="${escapeHtml(state.ui.askPrompt)}" placeholder="Ask a role..." />
          <button data-action="ask-role" ${state.ui.loading ? "disabled" : ""}>Ask</button>
        </div>
        <div class="inline-form">
          <input data-field="clarifyText" value="${escapeHtml(state.ui.clarifyText)}" placeholder="Clarify context..." />
          <button data-action="clarify">Clarify</button>
        </div>
      </section>

      <section class="dock-card">
        <div class="section-title">Human decision</div>
        <div class="inline-form">
          <select data-field="decisionChoice">
            <option value="">Choose...</option>
            ${choices}
            <option value="modify">Modify recommendation</option>
            <option value="defer">Defer decision</option>
            <option value="reject">Reject all</option>
          </select>
          <input data-field="decisionRationale" value="${escapeHtml(state.ui.decisionRationale)}" placeholder="Rationale..." />
          <button data-action="decide" ${recommendation || session.canvas.options.length ? "" : "disabled"}>Decide</button>
        </div>
      </section>

      <section class="dock-card">
        <div class="section-title">Commitment and review</div>
        <div class="inline-form">
          <input data-field="commitmentAction" value="${escapeHtml(state.ui.commitmentAction)}" placeholder="Next action..." />
          <input data-field="commitmentSuccess" value="${escapeHtml(state.ui.commitmentSuccess)}" placeholder="Success criteria..." />
          <input data-field="commitmentDue" type="date" value="${escapeHtml(state.ui.commitmentDue)}" />
          <button data-action="commit">Commit</button>
        </div>
        <div class="inline-form">
          <input data-field="reviewDate" type="date" value="${escapeHtml(state.ui.reviewDate)}" />
          <input data-field="reviewTrigger" value="${escapeHtml(state.ui.reviewTrigger)}" placeholder="Review trigger..." />
          <button data-action="schedule-review">Schedule review</button>
        </div>
      </section>

      <section class="dock-card">
        <div class="section-title">Retrospective</div>
        <div class="inline-form">
          <input data-field="retrospectiveOutcome" value="${escapeHtml(state.ui.retrospectiveOutcome)}" placeholder="Outcome summary..." />
          <input data-field="retrospectiveHappened" value="${escapeHtml(state.ui.retrospectiveHappened)}" placeholder="What happened..." />
        </div>
        <div class="inline-form">
          <input data-field="retrospectiveAssumptions" value="${escapeHtml(state.ui.retrospectiveAssumptions)}" placeholder="Assumption updates..." />
          <input data-field="retrospectiveLesson" value="${escapeHtml(state.ui.retrospectiveLesson)}" placeholder="Lesson..." />
          <button data-action="complete-retrospective">Complete</button>
        </div>
      </section>
    </div>
  `;
}

function renderSafeRoute(risk) {
  return `
    <div class="safe-route">
      <strong>Safety boundary: ${escapeHtml(risk.category)}</strong>
      <p>${escapeHtml(risk.message)}</p>
    </div>
  `;
}

function renderEmptyCouncil() {
  return `
    <div class="empty-state">
      <h2>Start with a real decision.</h2>
      <p>Private Council will structure the meeting, preserve disagreement, and build a decision record.</p>
    </div>
  `;
}

function renderEmptyCanvas() {
  return `
    <div class="empty-state">
      <h2>Decision Canvas</h2>
      <p>The canvas will collect options, criteria, claims, assumptions, risks, and review plans.</p>
    </div>
  `;
}

function renderStartHint() {
  return `<p class="muted">Create a session to unlock meeting actions.</p>`;
}

function renderList(items, key, empty) {
  if (!items.length) return `<p class="muted">${empty}</p>`;
  return `
    <ul class="dense-list">
      ${items.map((item) => `<li><span>${escapeHtml(item[key])}</span></li>`).join("")}
    </ul>
  `;
}

function bindEvents() {
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeTab = button.dataset.tab;
      render();
    });
  });

  document.querySelectorAll("[data-session-id]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeId = button.dataset.sessionId;
      render();
    });
  });

  const form = document.querySelector("[data-action='create-session']");
  form?.addEventListener("input", (event) => {
    const target = event.target;
    if (target.name) state.draft[target.name] = target.value;
  });
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const result = await createServerSession(state.draft);
    if (result.blocked) {
      state.ui.safeRoute = result.risk;
      render();
      return;
    }
    state.ui.safeRoute = null;
    state.draft = {
      question: "",
      background: "",
      currentLeaning: "",
      timeHorizon: "",
      emotionalState: "",
      constraints: ""
    };
    setSession(result.session);
    await refreshMemory();
  });

  document.querySelectorAll("[data-field]").forEach((input) => {
    input.addEventListener("input", () => {
      state.ui[input.dataset.field] = input.value;
    });
  });

  document.querySelectorAll("[data-criterion-id]").forEach((input) => {
    input.addEventListener("input", async () => {
      const session = getActiveSession();
      if (session) setSession(await updateServerCriterion(session, input.dataset.criterionId, input.value));
    });
  });

  document.querySelectorAll("[data-action]").forEach((button) => {
    if (button.dataset.action === "create-session") return;
    button.addEventListener("click", () => handleAction(button.dataset.action));
  });
}

async function handleAction(action) {
  const session = getActiveSession();
  if (!session) return;

  if (action === "continue") {
    await runAsync(() => advanceServerSession(session));
    return;
  }

  if (action === "run-phase") {
    await runAsync(() => runServerPhase(session));
    return;
  }

  if (action === "challenge") {
    await runAsync(() => askServerRole(session, "skeptic", "Challenge the strongest current option."));
    return;
  }

  if (action === "cross-validate") {
    await runAsync(() => crossValidateServerSession(session));
    return;
  }

  if (action === "recommend") {
    await runAsync(async () => {
      let next = session;
      while (!["recommendation", "human_decision", "commitment", "scheduled_review"].includes(next.currentPhase)) {
        next = await advanceServerSession(next);
      }
      if (next.currentPhase === "recommendation") next = await advanceServerSession(next);
      return next;
    });
    return;
  }

  if (action === "ask-role") {
    const prompt = state.ui.askPrompt.trim();
    if (prompt) {
      await runAsync(() => askServerRole(session, state.ui.askRoleId, prompt));
      state.ui.askPrompt = "";
    }
    return;
  }

  if (action === "clarify") {
    const text = state.ui.clarifyText.trim();
    if (text) {
      setSession(await clarifyServerContext(session, text));
      state.ui.clarifyText = "";
    }
    return;
  }

  if (action === "add-evidence") {
    if (state.ui.evidenceText.trim()) {
      setSession(
        await addServerEvidence(session, {
          text: state.ui.evidenceText,
          source: state.ui.evidenceSource,
          url: state.ui.evidenceUrl,
          quality: state.ui.evidenceQuality
        })
      );
      state.ui.evidenceText = "";
      state.ui.evidenceSource = "";
      state.ui.evidenceUrl = "";
      state.ui.evidenceQuality = "medium";
    }
    return;
  }

  if (action === "memory-accept" || action === "memory-reject") {
    const button = document.activeElement;
    const candidateId = button?.dataset?.memoryId;
    if (candidateId) {
      setSession(
        await updateServerMemory(session, {
          candidateId,
          decision: action === "memory-accept" ? "accepted" : "rejected"
        })
      );
      await refreshMemory();
    }
    return;
  }

  if (action === "delete-memory") {
    const button = document.activeElement;
    const memoryId = button?.dataset?.memoryId;
    if (memoryId) {
      await deleteServerMemory(memoryId);
      await refreshMemory();
    }
    return;
  }

  if (action === "decide") {
    const choice = state.ui.decisionChoice || session.canvas.recommendation?.optionId || "defer";
    setSession(
      await recordServerDecision(session, {
        choice,
        rationale: state.ui.decisionRationale
      })
    );
    state.ui.decisionChoice = "";
    state.ui.decisionRationale = "";
    return;
  }

  if (action === "commit") {
    setSession(
      await addServerCommitment(session, {
        action: state.ui.commitmentAction,
        successCriteria: state.ui.commitmentSuccess,
        dueDate: state.ui.commitmentDue
      })
    );
    state.ui.commitmentAction = "";
    state.ui.commitmentSuccess = "";
    state.ui.commitmentDue = "";
    return;
  }

  if (action === "schedule-review") {
    setSession(
      await scheduleServerReview(session, {
        reviewDate: state.ui.reviewDate,
        trigger: state.ui.reviewTrigger
      })
    );
    state.ui.reviewDate = "";
    state.ui.reviewTrigger = "";
    await refreshSessions();
    return;
  }

  if (action === "complete-retrospective") {
    setSession(
      await completeServerRetrospective(session, {
        outcomeSummary: state.ui.retrospectiveOutcome,
        whatHappened: state.ui.retrospectiveHappened,
        assumptionUpdates: state.ui.retrospectiveAssumptions,
        decisionLesson: state.ui.retrospectiveLesson
      })
    );
    state.ui.retrospectiveOutcome = "";
    state.ui.retrospectiveHappened = "";
    state.ui.retrospectiveAssumptions = "";
    state.ui.retrospectiveLesson = "";
  }
}

async function runAsync(operation) {
  if (state.ui.loading) return;
  setLoading(true);
  try {
    const session = await operation();
    setSession(session);
  } finally {
    state.ui.loading = false;
    await refreshAgentConfig();
  }
}

function capitalize(value) {
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
