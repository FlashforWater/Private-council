# Architecture

Private Council is currently a dependency-light local full-stack app.

## Runtime

- `server.js` serves static files and JSON APIs.
- `src/app.js` is the browser UI.
- `.private-council-data/sessions.json` stores sessions.
- `.private-council-data/memory.json` stores accepted long-term memory.

## Core Flow

1. User creates a session.
2. `protocolRouter` classifies the decision type.
3. Server persists the session.
4. User advances phases.
5. `turnAllocator` decides which roles speak.
6. Role output comes from a configured LLM provider or mock fallback.
7. `claimAggregator`, `crossValidation`, `evaluationEngine`, `reliabilityEngine`, and `privacyGovernance` update the Decision Canvas.
8. User decides, commits, schedules review, and later completes retrospective.

## Model Routing

Global routing is controlled by:

```text
COUNCIL_PROVIDER
COUNCIL_MODEL
```

Per-role overrides use:

```text
COUNCIL_PROVIDER_SKEPTIC
COUNCIL_MODEL_SKEPTIC
```

Supported providers:

- OpenAI
- Anthropic
- Gemini
- DeepSeek
- Kimi / Moonshot
- Qwen / Alibaba Cloud Model Studio
- Mock fallback
