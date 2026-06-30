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
  autoRunServerSession,
  clarifyServerContext,
  completeServerRetrospective,
  crossValidateServerSession,
  createServerSession,
  deleteServerMemory,
  deleteServerSession,
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
const savedLocale = localStorage.getItem("privateCouncil.locale");
const initialLocale = ["zh", "en"].includes(savedLocale) ? savedLocale : "zh";

const TEXT = {
  en: {
    tagline: "Structured decisions, not open-ended chat.",
    decisionQuestion: "Decision question",
    decisionQuestionPlaceholder: "Should I quit my job to work on my AI product?",
    background: "Background",
    backgroundPlaceholder: "What matters, what happened, and what options are visible?",
    currentLeaning: "Current leaning",
    currentLeaningPlaceholder: "I am leaning toward...",
    timeHorizon: "Time horizon",
    timeHorizonPlaceholder: "2 weeks, 6 months...",
    emotionalState: "Emotional state",
    emotionalStatePlaceholder: "Excited, anxious...",
    constraints: "Constraints",
    constraintsPlaceholder: "Money, time, family, legal boundaries...",
    startCouncil: "Start council",
    sessions: "Sessions",
    dueReviews: "Due Reviews",
    memory: "Memory",
    delete: "Delete",
    noSessions: "No sessions yet.",
    noMemory: "No saved memory.",
    modelsOnline: "Models online",
    modelStatus: "Model status",
    councilRoom: "Council Room",
    transcript: "Transcript",
    entries: "entries",
    decisionCanvas: "Decision Canvas",
    traceableRecord: "Traceable record",
    decided: "decided",
    forming: "forming",
    problem: "Problem",
    retrievedMemory: "Retrieved Memory",
    protocol: "Protocol",
    options: "Options",
    criteria: "Criteria",
    evaluation: "Evaluation",
    keyClaims: "Key Claims",
    noClaims: "No claims yet.",
    assumptions: "Assumptions",
    noAssumptions: "No assumptions yet.",
    risks: "Risks",
    evidence: "Evidence",
    disagreements: "Disagreements",
    crossValidation: "Cross-Validation",
    recommendation: "Recommendation",
    humanDecision: "Human Decision",
    reviewPlan: "Review Plan",
    reliability: "Reliability",
    memoryCandidates: "Memory Candidates",
    original: "Original",
    refined: "Refined",
    time: "Time",
    leaning: "Leaning",
    energy: "Energy",
    notSet: "Not set",
    pendingChair: "Pending Chair framing.",
    noPriorMemory: "No prior memory matched this session.",
    relevance: "relevance",
    optionsPending: "Options will appear during evaluation.",
    protocolPending: "Protocol will be selected when a session starts.",
    council: "Council",
    currentTurns: "Current turns",
    evaluationPending: "Evaluation appears after options are available.",
    weakest: "Weakest",
    noWeakCriteria: "No weak criteria under current scores.",
    noRisks: "No risks recorded yet.",
    likelihood: "likelihood",
    impact: "impact",
    noEvidence: "No evidence recorded yet.",
    disagreementPending: "Challenges and minority views will appear here.",
    crossValidationPending: "Cross-validation has not been evaluated yet.",
    triggered: "Triggered",
    notTriggered: "Not triggered",
    reasons: "Reasons",
    status: "Status",
    minorityOpinions: "Minority opinions",
    none: "none",
    noRecommendation: "No recommendation yet.",
    confidence: "confidence",
    nextAction: "Next action",
    review: "Review",
    noHumanDecision: "The user has not decided yet.",
    noRationale: "No rationale provided.",
    noReview: "No review scheduled yet.",
    date: "Date",
    trigger: "Trigger",
    triggerBased: "Trigger-based",
    reliabilityPending: "Reliability profile appears after agent runs.",
    roles: "Roles",
    models: "Models",
    noMemoryCandidates: "No memory candidates yet.",
    sensitivity: "sensitivity",
    consentNeeded: "consent needed",
    sessionRecord: "session record",
    save: "Save",
    reject: "Reject",
    runningCouncil: "Running council",
    meetingControls: "Meeting controls",
    quickControls: "Quick controls",
    running: "Running...",
    continue: "Continue",
    autoRun: "Auto-run",
    runCurrentPhase: "Run current phase",
    challengeThis: "Challenge this",
    generateRecommendation: "Generate recommendation",
    exportReport: "Export report",
    nextPhase: "Next phase",
    evidencePlaceholder: "Evidence or source note...",
    sourcePlaceholder: "Source...",
    add: "Add",
    optionalUrl: "Optional URL...",
    askOrClarify: "Ask or clarify",
    askRolePlaceholder: "Ask a role...",
    ask: "Ask",
    clarifyPlaceholder: "Clarify context...",
    clarify: "Clarify",
    choose: "Choose...",
    modifyRecommendation: "Modify recommendation",
    deferDecision: "Defer decision",
    rejectAll: "Reject all",
    rationalePlaceholder: "Rationale...",
    decide: "Decide",
    commitmentAndReview: "Commitment and review",
    nextActionPlaceholder: "Next action...",
    successCriteriaPlaceholder: "Success criteria...",
    commit: "Commit",
    reviewTriggerPlaceholder: "Review trigger...",
    scheduleReview: "Schedule review",
    retrospective: "Retrospective",
    outcomePlaceholder: "Outcome summary...",
    happenedPlaceholder: "What happened...",
    assumptionUpdatesPlaceholder: "Assumption updates...",
    lessonPlaceholder: "Lesson...",
    complete: "Complete",
    runStatusHint: "Calling the configured council routes. Real model calls can take a minute; keep this tab open.",
    safetyBoundary: "Safety boundary",
    emptyCouncilTitle: "Start with a real decision.",
    emptyCouncilBody: "Private Council will structure the meeting, preserve disagreement, and build a decision record.",
    emptyCanvasBody: "The canvas will collect options, criteria, claims, assumptions, risks, and review plans.",
    startHint: "Create a session to unlock meeting actions.",
    speaking: "speaking",
    idle: "idle",
    waiting: "waiting",
    routePending: "model route pending",
    advancingPhase: "Advancing one council phase",
    autoRunningSequence: "Auto-running the council sequence",
    runningCurrentPhase: "Running the current phase",
    askingSkeptic: "Asking Skeptic to challenge the plan",
    runningCrossValidation: "Running cross-validation",
    generatingRecommendation: "Generating a recommendation",
    askingRole: "Asking {role}",
    selectedRole: "selected role",
    tabCouncil: "Council",
    tabCanvas: "Canvas",
    tabDecision: "Decision",
    apiUnavailable: "API server unavailable; using browser mock mode.",
    checkingProvider: "Checking agent provider..."
  },
  zh: {
    tagline: "结构化决策，不是无边界聊天。",
    decisionQuestion: "决策问题",
    decisionQuestionPlaceholder: "我应该辞职去做自己的 AI 产品吗？",
    background: "背景",
    backgroundPlaceholder: "哪些事情重要？发生了什么？目前有哪些选项？",
    currentLeaning: "当前倾向",
    currentLeaningPlaceholder: "我现在倾向于...",
    timeHorizon: "时间范围",
    timeHorizonPlaceholder: "2 周、6 个月...",
    emotionalState: "情绪状态",
    emotionalStatePlaceholder: "兴奋、焦虑、疲惫...",
    constraints: "约束条件",
    constraintsPlaceholder: "资金、时间、家庭、法律边界...",
    startCouncil: "启动智囊团",
    sessions: "历史会话",
    dueReviews: "到期复盘",
    memory: "记忆库",
    delete: "删除",
    noSessions: "还没有会话。",
    noMemory: "还没有保存的记忆。",
    modelsOnline: "模型在线",
    modelStatus: "模型状态",
    councilRoom: "智囊团会场",
    transcript: "会议记录",
    entries: "条记录",
    decisionCanvas: "决策画布",
    traceableRecord: "可追溯记录",
    decided: "已决策",
    forming: "形成中",
    problem: "问题",
    retrievedMemory: "检索到的记忆",
    protocol: "协议",
    options: "选项",
    criteria: "标准",
    evaluation: "评估",
    keyClaims: "关键主张",
    noClaims: "还没有主张。",
    assumptions: "假设",
    noAssumptions: "还没有假设。",
    risks: "风险",
    evidence: "证据",
    disagreements: "分歧",
    crossValidation: "交叉验证",
    recommendation: "建议",
    humanDecision: "人工决策",
    reviewPlan: "复盘计划",
    reliability: "可靠性",
    memoryCandidates: "记忆候选",
    original: "原始问题",
    refined: "重构问题",
    time: "时间",
    leaning: "倾向",
    energy: "能量状态",
    notSet: "未设置",
    pendingChair: "等待 Chair 重构问题。",
    noPriorMemory: "没有匹配到历史记忆。",
    relevance: "相关度",
    optionsPending: "选项会在评估阶段出现。",
    protocolPending: "协议会在会话启动后选择。",
    council: "参会角色",
    currentTurns: "当前轮次",
    evaluationPending: "有选项后会显示评估。",
    weakest: "最弱项",
    noWeakCriteria: "当前评分下没有明显弱项。",
    noRisks: "还没有记录风险。",
    likelihood: "可能性",
    impact: "影响",
    noEvidence: "还没有记录证据。",
    disagreementPending: "挑战意见和少数观点会显示在这里。",
    crossValidationPending: "还没有进行交叉验证。",
    triggered: "已触发",
    notTriggered: "未触发",
    reasons: "原因",
    status: "状态",
    minorityOpinions: "少数意见",
    none: "无",
    noRecommendation: "还没有建议。",
    confidence: "置信度",
    nextAction: "下一步",
    review: "复盘",
    noHumanDecision: "用户还没有做出决策。",
    noRationale: "没有填写理由。",
    noReview: "还没有安排复盘。",
    date: "日期",
    trigger: "触发条件",
    triggerBased: "按触发条件",
    reliabilityPending: "角色运行后会显示可靠性画像。",
    roles: "角色",
    models: "模型",
    noMemoryCandidates: "还没有记忆候选。",
    sensitivity: "敏感度",
    consentNeeded: "需要同意",
    sessionRecord: "会话记录",
    save: "保存",
    reject: "拒绝",
    runningCouncil: "智囊团运行中",
    meetingControls: "会议控制",
    quickControls: "快捷控制",
    running: "运行中...",
    continue: "继续",
    autoRun: "自动运行",
    runCurrentPhase: "运行当前阶段",
    challengeThis: "发起挑战",
    generateRecommendation: "生成建议",
    exportReport: "导出报告",
    nextPhase: "下一阶段",
    evidencePlaceholder: "证据或来源说明...",
    sourcePlaceholder: "来源...",
    add: "添加",
    optionalUrl: "可选 URL...",
    askOrClarify: "提问或补充",
    askRolePlaceholder: "向某个角色提问...",
    ask: "提问",
    clarifyPlaceholder: "补充上下文...",
    clarify: "补充",
    choose: "选择...",
    modifyRecommendation: "修改建议",
    deferDecision: "暂缓决策",
    rejectAll: "全部拒绝",
    rationalePlaceholder: "决策理由...",
    decide: "决策",
    commitmentAndReview: "承诺与复盘",
    nextActionPlaceholder: "下一步行动...",
    successCriteriaPlaceholder: "成功标准...",
    commit: "承诺",
    reviewTriggerPlaceholder: "复盘触发条件...",
    scheduleReview: "安排复盘",
    retrospective: "复盘",
    outcomePlaceholder: "结果摘要...",
    happenedPlaceholder: "实际发生了什么...",
    assumptionUpdatesPlaceholder: "假设更新...",
    lessonPlaceholder: "经验教训...",
    complete: "完成",
    runStatusHint: "正在调用已配置的角色模型。真实模型可能需要一分钟，请保持页面打开。",
    safetyBoundary: "安全边界",
    emptyCouncilTitle: "从一个真实决策开始。",
    emptyCouncilBody: "Private Council 会组织讨论、保留分歧，并生成可追溯的决策记录。",
    emptyCanvasBody: "画布会收集选项、标准、主张、假设、风险和复盘计划。",
    startHint: "创建会话后即可使用会议操作。",
    speaking: "发言中",
    idle: "空闲",
    waiting: "等待中",
    routePending: "等待模型路由",
    advancingPhase: "正在推进一个会议阶段",
    autoRunningSequence: "正在自动运行智囊团流程",
    runningCurrentPhase: "正在运行当前阶段",
    askingSkeptic: "正在让 Skeptic 挑战方案",
    runningCrossValidation: "正在运行交叉验证",
    generatingRecommendation: "正在生成建议",
    askingRole: "正在询问 {role}",
    selectedRole: "所选角色",
    tabCouncil: "会场",
    tabCanvas: "画布",
    tabDecision: "决策",
    apiUnavailable: "API 服务不可用；正在使用浏览器 mock 模式。",
    checkingProvider: "正在检查模型服务..."
  }
};

const PHASE_LABELS_BY_LOCALE = {
  en: PHASE_LABELS,
  zh: {
    created: "已创建",
    framing: "框定",
    context_collection: "上下文",
    independent_views: "观点",
    challenge: "挑战",
    evaluation: "评估",
    recommendation: "建议",
    human_decision: "决策",
    commitment: "承诺",
    scheduled_review: "复盘计划",
    retrospective: "复盘",
    closed: "已关闭"
  }
};

const ROLE_LABELS_BY_LOCALE = {
  zh: {
    chair: { name: "主席", purpose: "保持会议结构，保留有价值的分歧。" },
    strategist: { name: "战略家", purpose: "检验长期一致性和机会成本。" },
    skeptic: { name: "怀疑者", purpose: "攻击薄弱假设和失败路径。" },
    operator: { name: "执行官", purpose: "把判断转化为可执行的下一步。" },
    researcher: { name: "研究员", purpose: "区分事实、假设和信息缺口。" },
    user_advocate: { name: "用户代言人", purpose: "保护精力、价值观和现实约束。" },
    reflector: { name: "复盘者", purpose: "在复盘时比较预测和结果。" }
  }
};

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
    locale: initialLocale,
    loading: false,
    loadingLabel: "",
    apiConfig: {
      available: false,
      provider: "mock",
      model: "mock-agent-v1",
      message: ""
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
syncDocumentLanguage();

function t(key, replacements = {}) {
  const template = TEXT[state.ui.locale]?.[key] ?? TEXT.en[key] ?? key;
  return Object.entries(replacements).reduce(
    (value, [name, replacement]) => value.replaceAll(`{${name}}`, replacement),
    template
  );
}

function phaseLabel(phase) {
  return PHASE_LABELS_BY_LOCALE[state.ui.locale]?.[phase] || PHASE_LABELS[phase] || phase;
}

function roleName(role) {
  return ROLE_LABELS_BY_LOCALE[state.ui.locale]?.[role.id]?.name || role.name;
}

function rolePurpose(role) {
  return ROLE_LABELS_BY_LOCALE[state.ui.locale]?.[role.id]?.purpose || role.purpose;
}

function syncDocumentLanguage() {
  document.documentElement.lang = state.ui.locale === "zh" ? "zh-CN" : "en";
}

function translateApiMessage(message) {
  if (!message) return t("checkingProvider");
  if (message === "API server unavailable; using browser mock mode.") return t("apiUnavailable");
  return message;
}

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

function setLoading(loading, label = "") {
  state.ui.loading = loading;
  state.ui.loadingLabel = loading ? label : "";
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
          <p>${t("tagline")}</p>
        </div>
      </div>
      ${renderLanguageSwitch()}

      ${renderProviderStatus()}

      <form class="new-session" data-action="create-session">
        <label>
          ${t("decisionQuestion")}
          <textarea name="question" rows="3" placeholder="${t("decisionQuestionPlaceholder")}">${escapeHtml(state.draft.question)}</textarea>
        </label>
        <label>
          ${t("background")}
          <textarea name="background" rows="4" placeholder="${t("backgroundPlaceholder")}">${escapeHtml(state.draft.background)}</textarea>
        </label>
        <label>
          ${t("currentLeaning")}
          <input name="currentLeaning" value="${escapeHtml(state.draft.currentLeaning)}" placeholder="${t("currentLeaningPlaceholder")}" />
        </label>
        <div class="field-grid">
          <label>
            ${t("timeHorizon")}
            <input name="timeHorizon" value="${escapeHtml(state.draft.timeHorizon)}" placeholder="${t("timeHorizonPlaceholder")}" />
          </label>
          <label>
            ${t("emotionalState")}
            <input name="emotionalState" value="${escapeHtml(state.draft.emotionalState)}" placeholder="${t("emotionalStatePlaceholder")}" />
          </label>
        </div>
        <label>
          ${t("constraints")}
          <textarea name="constraints" rows="2" placeholder="${t("constraintsPlaceholder")}">${escapeHtml(state.draft.constraints)}</textarea>
        </label>
        <button class="primary" type="submit">${t("startCouncil")}</button>
      </form>

      ${state.ui.safeRoute ? renderSafeRoute(state.ui.safeRoute) : ""}

      <div class="session-list">
        ${renderDueReviews()}
        <div class="section-title">${t("sessions")}</div>
        ${
          state.sessions.length
            ? state.sessions
                .map(
                  (item) => `
                    <div class="session-row">
                      <button class="session-item ${session?.id === item.id ? "selected" : ""}" data-session-id="${item.id}">
                        <span>${escapeHtml(item.title)}</span>
                        <small>${phaseLabel(item.currentPhase)} · ${escapeHtml(item.status)}</small>
                      </button>
                      <button class="icon-danger" title="${t("delete")}" data-action="delete-session" data-session-delete-id="${item.id}">${t("delete")}</button>
                    </div>
                  `
                )
                .join("")
            : `<p class="muted">${t("noSessions")}</p>`
        }
      </div>
      ${renderMemoryLibrary()}
    </aside>
  `;
}

function renderLanguageSwitch() {
  return `
    <div class="language-switch" aria-label="Language">
      <button class="${state.ui.locale === "zh" ? "selected" : ""}" data-locale="zh">中文</button>
      <button class="${state.ui.locale === "en" ? "selected" : ""}" data-locale="en">English</button>
    </div>
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
      <div class="section-title">${t("dueReviews")}</div>
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
      <div class="section-title">${t("memory")}</div>
      ${
        state.memories.length
          ? state.memories
              .slice(0, 6)
              .map(
                (memory) => `
                  <article class="memory-item">
                    <span>${escapeHtml(memory.text)}</span>
                    <small>${escapeHtml(memory.type)} · ${escapeHtml(memory.sensitivity)}</small>
                    <button data-action="delete-memory" data-memory-id="${escapeHtml(memory.id)}">${t("delete")}</button>
                  </article>
                `
              )
              .join("")
          : `<p class="muted">${t("noMemory")}</p>`
      }
    </div>
  `;
}

function renderProviderStatus() {
  const config = state.ui.apiConfig;
  return `
    <div class="provider-status ${config.available ? "live" : ""}">
      <div>
        <strong>${escapeHtml(config.available ? t("modelsOnline") : t("modelStatus"))}</strong>
        <span>${escapeHtml(config.provider)} · ${escapeHtml(config.model)}</span>
      </div>
      <small>${escapeHtml(translateApiMessage(config.message))}</small>
    </div>
  `;
}

function renderMobileTabs() {
  const tabs = [
    ["council", t("tabCouncil")],
    ["canvas", t("tabCanvas")],
    ["decision", t("tabDecision")]
  ];
  return `
    <nav class="mobile-tabs" aria-label="Workspace tabs">
      ${tabs
        .map(
          ([tab, label]) => `
            <button class="${state.activeTab === tab ? "selected" : ""}" data-tab="${tab}">
              ${label}
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
        <div class="eyebrow">${t("councilRoom")}</div>
        <h2>${escapeHtml(session.title)}</h2>
      </div>
      <span class="status-pill">${phaseLabel(session.currentPhase)}</span>
    </div>
    ${renderPhaseRail(session)}
    ${renderQuickControls(session)}
    <div class="role-grid">
      ${COUNCIL_ROLES.map((role) => renderRoleCard(role, session)).join("")}
    </div>
    ${renderTranscript(session)}
  `;
}

function renderQuickControls(session) {
  return `
    <div class="quick-controls">
      <div>
        <div class="section-title">${t("quickControls")}</div>
        <p>${t("nextPhase")}: ${phaseLabel(nextPhase(session.currentPhase))}</p>
      </div>
      <div class="quick-actions">
        <button class="primary" data-action="continue" ${state.ui.loading ? "disabled" : ""}>${state.ui.loading ? t("running") : t("continue")}</button>
        <button class="auto-run-button" data-action="auto-run" ${state.ui.loading ? "disabled" : ""}>${t("autoRun")}</button>
        <button data-action="run-phase" ${state.ui.loading ? "disabled" : ""}>${t("runCurrentPhase")}</button>
        <button data-action="challenge" ${state.ui.loading ? "disabled" : ""}>${t("challengeThis")}</button>
        <button data-action="cross-validate" ${state.ui.loading ? "disabled" : ""}>${t("crossValidation")}</button>
        <button data-action="recommend" ${state.ui.loading ? "disabled" : ""}>${t("generateRecommendation")}</button>
        <a class="button-link" href="${reportUrl(session)}" target="_blank" rel="noreferrer">${t("exportReport")}</a>
      </div>
    </div>
    ${state.ui.loading ? renderRunStatus(state.ui.loadingLabel || t("runningCouncil")) : ""}
  `;
}

function renderTranscript(session) {
  return `
    <section class="transcript">
      <div class="transcript-header">
        <div>
          <div class="section-title">${t("transcript")}</div>
          <p>${session.transcript.length} ${t("entries")}</p>
        </div>
      </div>
      <div class="transcript-feed">
        ${session.transcript.map((message) => renderMessage(message)).join("")}
      </div>
    </section>
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
          return `<li class="${className}"><span></span>${phaseLabel(phase)}</li>`;
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
  const plannedRoute = plannedRoleRoute(role.id);
  const active = session.transcript[session.transcript.length - 1]?.roleId === role.id;
  const stateLabel = active ? t("speaking") : lastRun ? t("idle") : t("waiting");
  const routeLabel =
    lastRun?.provider && lastRun?.model
      ? `${lastRun.provider} / ${lastRun.model}`
      : plannedRoute
        ? `${plannedRoute.provider} / ${plannedRoute.model}`
        : t("routePending");

  return `
    <article class="role-card ${active ? "active" : ""}" data-role="${role.id}">
      <div class="role-top">
        <span class="avatar ${role.color}">${role.name.slice(0, 1)}</span>
        <div>
          <h3>${roleName(role)}</h3>
          <small>${stateLabel} · ${escapeHtml(routeLabel)}</small>
        </div>
      </div>
      <p>${escapeHtml(lastRun?.output.summary || rolePurpose(role))}</p>
    </article>
  `;
}

function plannedRoleRoute(roleId) {
  return state.ui.apiConfig.roleRoutes?.find((route) => route.roleId === roleId);
}

function renderMessage(message) {
  const role = COUNCIL_ROLES.find((item) => item.id === message.roleId);
  const displayName = role ? roleName(role) : message.speaker;
  const avatarText = role ? role.name.slice(0, 1) : "U";
  const roleColor = role?.color || "user";
  return `
    <article class="message ${message.roleId === "user" ? "from-user" : ""}" data-role="${escapeHtml(message.roleId)}">
      <span class="message-avatar ${roleColor}">${escapeHtml(avatarText)}</span>
      <div class="message-body">
        <div class="message-meta">
          <strong>${escapeHtml(displayName)}</strong>
          <span>${phaseLabel(message.phase)}</span>
        </div>
        <p>${escapeHtml(message.content)}</p>
        ${role ? `<small>${escapeHtml(rolePurpose(role))}</small>` : ""}
      </div>
    </article>
  `;
}

function renderCanvas(session) {
  const canvas = session.canvas;
  const rankedOptions = rankOptions(canvas.options, canvas.criteria);
  return `
    <div class="panel-header">
      <div>
        <div class="eyebrow">${t("decisionCanvas")}</div>
        <h2>${t("traceableRecord")}</h2>
      </div>
      <span class="status-pill">${canvas.humanDecision ? t("decided") : t("forming")}</span>
    </div>

    ${renderCanvasSection(t("problem"), renderProblem(canvas))}
    ${renderCanvasSection(t("retrievedMemory"), renderRetrievedMemory(canvas.retrievedMemory))}
    ${renderCanvasSection(t("protocol"), renderProtocol(canvas))}
    ${renderCanvasSection(t("options"), renderOptions(rankedOptions))}
    ${renderCanvasSection(t("criteria"), renderCriteria(canvas.criteria))}
    ${renderCanvasSection(t("evaluation"), renderEvaluation(canvas.evaluation))}
    ${renderCanvasSection(t("keyClaims"), renderList(canvas.claims.slice(-8), "text", t("noClaims")))}
    ${renderCanvasSection(t("assumptions"), renderList(canvas.assumptions.slice(-8), "text", t("noAssumptions")))}
    ${renderCanvasSection(t("risks"), renderRisks(canvas.risks.slice(-8)))}
    ${renderCanvasSection(t("evidence"), renderEvidence(canvas.evidence))}
    ${renderCanvasSection(t("disagreements"), renderDisagreements(canvas))}
    ${renderCanvasSection(t("crossValidation"), renderCrossValidation(canvas))}
    ${renderCanvasSection(t("recommendation"), renderRecommendation(canvas.recommendation))}
    ${renderCanvasSection(t("humanDecision"), renderHumanDecision(canvas.humanDecision))}
    ${renderCanvasSection(t("reviewPlan"), renderReviewPlan(canvas.reviewPlan))}
    ${renderCanvasSection(t("reliability"), renderReliability(canvas.reliabilityProfile))}
    ${renderCanvasSection(t("memoryCandidates"), renderMemoryCandidates(canvas.memoryCandidates))}
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
      <p><strong>${t("original")}:</strong> ${escapeHtml(canvas.problem.originalQuestion)}</p>
      <p><strong>${t("refined")}:</strong> ${escapeHtml(canvas.problem.refinedQuestion || t("pendingChair"))}</p>
      <p><strong>${t("time")}:</strong> ${escapeHtml(canvas.problem.timeHorizon || t("notSet"))}</p>
      <p><strong>${t("leaning")}:</strong> ${escapeHtml(canvas.context.currentLeaning || t("notSet"))}</p>
      <p><strong>${t("energy")}:</strong> ${escapeHtml(canvas.emotionalContext?.state || t("notSet"))}</p>
    </div>
  `;
}

function renderRetrievedMemory(memories) {
  if (!memories?.length) return `<p class="muted">${t("noPriorMemory")}</p>`;
  return `
    <ul class="dense-list">
      ${memories
        .map(
          (memory) => `
            <li>
              <span>${escapeHtml(memory.text)}</span>
              <small>${escapeHtml(memory.type)} · ${t("relevance")} ${escapeHtml(memory.relevance)}</small>
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

function renderOptions(rankedOptions) {
  if (!rankedOptions.length) return `<p class="muted">${t("optionsPending")}</p>`;
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
  if (!route) return `<p class="muted">${t("protocolPending")}</p>`;
  return `
    <div class="stack">
      <p><strong>${escapeHtml(route.decisionType)}</strong> · ${escapeHtml(route.protocol)}</p>
      <p>${escapeHtml(route.rationale)}</p>
      <p><strong>${t("council")}:</strong> ${escapeHtml((route.councilComposition || []).join(", "))}</p>
      ${allocation ? `<p><strong>${t("currentTurns")}:</strong> ${escapeHtml(allocation.roleIds.join(", "))}</p>` : ""}
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
  if (!evaluation?.rows?.length) return `<p class="muted">${t("evaluationPending")}</p>`;
  return `
    <div class="option-list">
      ${evaluation.rows
        .map(
          (row) => `
            <article class="option-row">
              <div>
                <strong>${escapeHtml(row.optionTitle)}</strong>
                <p>${escapeHtml(row.weakestCriteria.length ? `${t("weakest")}: ${row.weakestCriteria.join(", ")}` : t("noWeakCriteria"))}</p>
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
  if (!risks.length) return `<p class="muted">${t("noRisks")}</p>`;
  return `
    <ul class="dense-list">
      ${risks
        .map(
          (risk) => `
            <li>
              <span>${escapeHtml(risk.text)}</span>
              <small>${escapeHtml(risk.likelihood)} ${t("likelihood")} · ${escapeHtml(risk.impact)} ${t("impact")}</small>
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

function renderEvidence(evidence) {
  if (!evidence?.length) return `<p class="muted">${t("noEvidence")}</p>`;
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
  return renderList(panel.slice(-6), "text", t("disagreementPending"));
}

function renderCrossValidation(canvas) {
  const trigger = canvas.crossValidationTrigger;
  const result = canvas.crossValidationResult;
  if (!trigger) return `<p class="muted">${t("crossValidationPending")}</p>`;
  return `
    <div class="stack">
      <p><strong>${trigger.shouldValidate ? t("triggered") : t("notTriggered")}</strong> · ${escapeHtml(trigger.severity)}</p>
      <p><strong>${t("reasons")}:</strong> ${escapeHtml(trigger.reasons?.join(", ") || t("none"))}</p>
      <p><strong>${t("status")}:</strong> ${escapeHtml(result?.status || "pending")}</p>
      <p><strong>${t("minorityOpinions")}:</strong> ${escapeHtml(result?.minorityOpinions?.join(" | ") || t("none"))}</p>
    </div>
  `;
}

function renderRecommendation(recommendation) {
  if (!recommendation) return `<p class="muted">${t("noRecommendation")}</p>`;
  return `
    <div class="stack">
      <p><strong>${escapeHtml(recommendation.optionTitle)}</strong> · ${escapeHtml(recommendation.confidence)} ${t("confidence")}</p>
      <p>${escapeHtml(recommendation.rationale)}</p>
      <p><strong>${t("nextAction")}:</strong> ${escapeHtml(recommendation.minimumNextAction)}</p>
      <p><strong>${t("review")}:</strong> ${escapeHtml(recommendation.reviewTiming)}</p>
    </div>
  `;
}

function renderHumanDecision(decision) {
  if (!decision) return `<p class="muted">${t("noHumanDecision")}</p>`;
  return `
    <div class="stack">
      <p><strong>${escapeHtml(decision.label)}</strong></p>
      <p>${escapeHtml(decision.rationale || t("noRationale"))}</p>
    </div>
  `;
}

function renderReviewPlan(reviewPlan) {
  if (!reviewPlan) return `<p class="muted">${t("noReview")}</p>`;
  return `
    <div class="stack">
      <p><strong>${t("date")}:</strong> ${escapeHtml(reviewPlan.reviewDate || t("triggerBased"))}</p>
      <p><strong>${t("trigger")}:</strong> ${escapeHtml(reviewPlan.trigger || t("notSet"))}</p>
    </div>
  `;
}

function renderReliability(profile) {
  if (!profile) return `<p class="muted">${t("reliabilityPending")}</p>`;
  return `
    <div class="stack">
      <p>${escapeHtml(profile.note)}</p>
      <p><strong>${t("roles")}:</strong> ${escapeHtml((profile.roles || []).map((role) => `${role.id}:${role.runs}`).join(", ") || t("none"))}</p>
      <p><strong>${t("models")}:</strong> ${escapeHtml((profile.models || []).map((model) => `${model.id}:${model.runs}`).join(", ") || t("none"))}</p>
    </div>
  `;
}

function renderMemoryCandidates(items) {
  if (!items?.length) return `<p class="muted">${t("noMemoryCandidates")}</p>`;
  return `
    <ul class="dense-list">
      ${items
        .map(
          (item) => `
            <li>
              <span>${escapeHtml(item.text)}</span>
              <small>${escapeHtml(item.type)} · ${escapeHtml(item.sensitivity)} ${t("sensitivity")} · ${item.requiresConsent ? t("consentNeeded") : t("sessionRecord")}</small>
              <div class="button-row">
                <button data-action="memory-accept" data-memory-id="${escapeHtml(item.id)}">${t("save")}</button>
                <button data-action="memory-reject" data-memory-id="${escapeHtml(item.id)}">${t("reject")}</button>
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
  const loadingLabel = state.ui.loadingLabel || t("runningCouncil");
  const choices = session.canvas.options
    .map((option) => `<option value="${option.id}">${escapeHtml(option.title)}</option>`)
    .join("");
  return `
    ${state.ui.loading ? renderRunStatus(loadingLabel) : ""}
    <div class="dock-grid">
      <section class="dock-card">
        <div class="section-title">${t("evidence")}</div>
        <div class="inline-form">
          <input data-field="evidenceText" value="${escapeHtml(state.ui.evidenceText)}" placeholder="${t("evidencePlaceholder")}" />
          <input data-field="evidenceSource" value="${escapeHtml(state.ui.evidenceSource)}" placeholder="${t("sourcePlaceholder")}" />
          <select data-field="evidenceQuality">
            ${["low", "medium", "high"].map((quality) => `<option value="${quality}" ${state.ui.evidenceQuality === quality ? "selected" : ""}>${quality}</option>`).join("")}
          </select>
          <button data-action="add-evidence">${t("add")}</button>
        </div>
        <input data-field="evidenceUrl" value="${escapeHtml(state.ui.evidenceUrl)}" placeholder="${t("optionalUrl")}" />
      </section>

      <section class="dock-card">
        <div class="section-title">${t("askOrClarify")}</div>
        <div class="inline-form">
          <select data-field="askRoleId">
            ${COUNCIL_ROLES.filter((role) => role.id !== "reflector")
              .map(
                (role) =>
                  `<option value="${role.id}" ${state.ui.askRoleId === role.id ? "selected" : ""}>${roleName(role)}</option>`
              )
              .join("")}
          </select>
          <input data-field="askPrompt" value="${escapeHtml(state.ui.askPrompt)}" placeholder="${t("askRolePlaceholder")}" />
          <button data-action="ask-role" ${state.ui.loading ? "disabled" : ""}>${t("ask")}</button>
        </div>
        <div class="inline-form">
          <input data-field="clarifyText" value="${escapeHtml(state.ui.clarifyText)}" placeholder="${t("clarifyPlaceholder")}" />
          <button data-action="clarify">${t("clarify")}</button>
        </div>
      </section>

      <section class="dock-card">
        <div class="section-title">${t("humanDecision")}</div>
        <div class="inline-form">
          <select data-field="decisionChoice">
            <option value="">${t("choose")}</option>
            ${choices}
            <option value="modify">${t("modifyRecommendation")}</option>
            <option value="defer">${t("deferDecision")}</option>
            <option value="reject">${t("rejectAll")}</option>
          </select>
          <input data-field="decisionRationale" value="${escapeHtml(state.ui.decisionRationale)}" placeholder="${t("rationalePlaceholder")}" />
          <button data-action="decide" ${recommendation || session.canvas.options.length ? "" : "disabled"}>${t("decide")}</button>
        </div>
      </section>

      <section class="dock-card">
        <div class="section-title">${t("commitmentAndReview")}</div>
        <div class="inline-form">
          <input data-field="commitmentAction" value="${escapeHtml(state.ui.commitmentAction)}" placeholder="${t("nextActionPlaceholder")}" />
          <input data-field="commitmentSuccess" value="${escapeHtml(state.ui.commitmentSuccess)}" placeholder="${t("successCriteriaPlaceholder")}" />
          <input data-field="commitmentDue" type="date" value="${escapeHtml(state.ui.commitmentDue)}" />
          <button data-action="commit">${t("commit")}</button>
        </div>
        <div class="inline-form">
          <input data-field="reviewDate" type="date" value="${escapeHtml(state.ui.reviewDate)}" />
          <input data-field="reviewTrigger" value="${escapeHtml(state.ui.reviewTrigger)}" placeholder="${t("reviewTriggerPlaceholder")}" />
          <button data-action="schedule-review">${t("scheduleReview")}</button>
        </div>
      </section>

      <section class="dock-card">
        <div class="section-title">${t("retrospective")}</div>
        <div class="inline-form">
          <input data-field="retrospectiveOutcome" value="${escapeHtml(state.ui.retrospectiveOutcome)}" placeholder="${t("outcomePlaceholder")}" />
          <input data-field="retrospectiveHappened" value="${escapeHtml(state.ui.retrospectiveHappened)}" placeholder="${t("happenedPlaceholder")}" />
        </div>
        <div class="inline-form">
          <input data-field="retrospectiveAssumptions" value="${escapeHtml(state.ui.retrospectiveAssumptions)}" placeholder="${t("assumptionUpdatesPlaceholder")}" />
          <input data-field="retrospectiveLesson" value="${escapeHtml(state.ui.retrospectiveLesson)}" placeholder="${t("lessonPlaceholder")}" />
          <button data-action="complete-retrospective">${t("complete")}</button>
        </div>
      </section>
    </div>
  `;
}

function renderRunStatus(label) {
  return `
    <div class="run-status" role="status" aria-live="polite">
      <div class="run-orbit" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div>
        <strong>${escapeHtml(label)}</strong>
        <small>${t("runStatusHint")}</small>
      </div>
    </div>
  `;
}

function renderSafeRoute(risk) {
  return `
    <div class="safe-route">
      <strong>${t("safetyBoundary")}: ${escapeHtml(risk.category)}</strong>
      <p>${escapeHtml(risk.message)}</p>
    </div>
  `;
}

function renderEmptyCouncil() {
  return `
    <div class="empty-state">
      <h2>${t("emptyCouncilTitle")}</h2>
      <p>${t("emptyCouncilBody")}</p>
    </div>
  `;
}

function renderEmptyCanvas() {
  return `
    <div class="empty-state">
      <h2>${t("decisionCanvas")}</h2>
      <p>${t("emptyCanvasBody")}</p>
    </div>
  `;
}

function renderStartHint() {
  return `<p class="muted">${t("startHint")}</p>`;
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
    const result = await createServerSession({ ...state.draft, locale: state.ui.locale });
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

  document.querySelectorAll("[data-locale]").forEach((button) => {
    button.addEventListener("click", () => {
      state.ui.locale = button.dataset.locale;
      localStorage.setItem("privateCouncil.locale", state.ui.locale);
      syncDocumentLanguage();
      render();
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

  if (action === "delete-session") {
    const button = document.activeElement;
    const sessionId = button?.dataset?.sessionDeleteId;
    if (!sessionId) return;
    const result = await deleteServerSession(sessionId);
    if (result.deleted) {
      state.sessions = state.sessions.filter((item) => item.id !== sessionId);
      if (state.activeId === sessionId) {
        state.activeId = state.sessions[0]?.id || null;
      }
      render();
    }
    return;
  }

  if (!session) return;

  if (action === "continue") {
    await runAsync(() => advanceServerSession(sessionForRequest(session)), t("advancingPhase"));
    return;
  }

  if (action === "auto-run") {
    await runAsync(() => autoRunServerSession(sessionForRequest(session)), t("autoRunningSequence"));
    return;
  }

  if (action === "run-phase") {
    await runAsync(() => runServerPhase(sessionForRequest(session)), t("runningCurrentPhase"));
    return;
  }

  if (action === "challenge") {
    await runAsync(() => askServerRole(sessionForRequest(session), "skeptic", "Challenge the strongest current option."), t("askingSkeptic"));
    return;
  }

  if (action === "cross-validate") {
    await runAsync(() => crossValidateServerSession(sessionForRequest(session)), t("runningCrossValidation"));
    return;
  }

  if (action === "recommend") {
    await runAsync(async () => {
      let next = sessionForRequest(session);
      while (!["recommendation", "human_decision", "commitment", "scheduled_review"].includes(next.currentPhase)) {
        next = await advanceServerSession(sessionForRequest(next));
      }
      if (next.currentPhase === "recommendation") next = await advanceServerSession(sessionForRequest(next));
      return next;
    }, t("generatingRecommendation"));
    return;
  }

  if (action === "ask-role") {
    const prompt = state.ui.askPrompt.trim();
    if (prompt) {
      const role = COUNCIL_ROLES.find((item) => item.id === state.ui.askRoleId);
      await runAsync(
        () => askServerRole(sessionForRequest(session), state.ui.askRoleId, prompt),
        t("askingRole", { role: role ? roleName(role) : t("selectedRole") })
      );
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

async function runAsync(operation, label = "Running council") {
  if (state.ui.loading) return;
  setLoading(true, label);
  try {
    const session = await operation();
    setSession(session);
  } finally {
    setLoading(false);
    await refreshAgentConfig();
  }
}

function sessionForRequest(session) {
  return { ...session, locale: state.ui.locale };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
