# Contributing

Thanks for taking a look at Private Council.

This project is a local-first research/product prototype. Contributions should preserve the core product idea:

- Council advises. Human decides.
- Preserve disagreement before synthesis.
- Decision Canvas is more important than chat history.
- Voting is a signal, not a verdict.
- Every decision should become learning material.

## Setup

```bash
npm test
npm run dev
```

Open:

```text
http://127.0.0.1:4173/
```

The app runs without API keys in mock mode.

## Useful Areas To Contribute

- Better protocol routing
- Better turn allocation
- Stronger cross-validation triggers
- Claim graph visualization
- Evidence and citation handling
- Safety classifier improvements
- Reliability dashboard
- Retrospective workflow
- UI polish
- Documentation and examples

## Code Style

- Keep modules small and testable.
- Prefer structured data over free-form transcript parsing.
- Keep mock mode working.
- Do not expose API keys to the browser.
- Add tests for algorithmic behavior.

## Tests

Run:

```bash
npm test
```

Before opening a PR, make sure tests pass.

## Safety

Do not add features that present the system as a professional substitute for medical, legal, investment, or crisis advice.

High-risk scenarios should route away from normal council flow.

