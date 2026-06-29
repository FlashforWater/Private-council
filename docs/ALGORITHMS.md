# Algorithms

Private Council uses simple, inspectable algorithms first. The goal is not to hide judgment inside opaque automation, but to make the decision process legible and adjustable.

## Protocol Router

The Protocol Router classifies the user's issue into a decision type:

- choice
- exploration
- review
- retrospective
- conflict
- uncertainty
- commitment
- emotional overload

It then selects an appropriate protocol and council composition.

Implemented in: [`src/protocolRouter.js`](../src/protocolRouter.js)

## Turn Allocator

The Turn Allocator decides which roles should speak in a phase.

It avoids calling every role for every phase and adds roles when the protocol or cross-validation trigger requires them.

Implemented in: [`src/turnAllocator.js`](../src/turnAllocator.js)

## Cross-validation Trigger

Cross-validation is triggered by signals such as:

- multiple high-impact risks
- material disagreement
- low model confidence
- many open unknowns
- pre-recommendation risk

Implemented in: [`src/crossValidation.js`](../src/crossValidation.js)

## Claim Aggregator

The Claim Aggregator deduplicates claims, extracts disagreement, identifies fragile assumptions, and ranks top risks.

Implemented in: [`src/claimAggregator.js`](../src/claimAggregator.js)

## Evaluation Engine

The Evaluation Engine uses weighted multi-criteria decision analysis.

Each option is scored across criteria such as:

- long-term alignment
- expected upside
- execution cost
- risk
- reversibility
- emotional cost
- information sufficiency

Implemented in: [`src/evaluationEngine.js`](../src/evaluationEngine.js)

## Reliability Engine

The Reliability Engine records predictions and supports retrospective scoring.

This is the beginning of role/model reliability learning.

Implemented in: [`src/reliabilityEngine.js`](../src/reliabilityEngine.js)

## Memory Governance

Memory is not saved automatically as a hidden personalization layer.

The system proposes memory candidates and lets the user accept or reject them.

Implemented in:

- [`src/privacyGovernance.js`](../src/privacyGovernance.js)
- [`src/memoryStore.js`](../src/memoryStore.js)

