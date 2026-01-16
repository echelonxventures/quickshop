# Capability Registry — v1

## Purpose
The Capability Registry defines **what the platform is allowed to do**.

No business logic (checkout, payment, shipment, AI decision, etc.)
may execute unless the corresponding capability is enabled.

This prevents:
- hard-coded features
- accidental rollouts
- compliance violations
- irreversible production mistakes

## Core Principles
- Immutable: capabilities are versioned, never edited
- Declarative: systems ask "is this allowed?"
- Auditable: every decision is explainable
- Business-aware: future support for per-business rules
- Country-aware: future support for geo restrictions

## Examples
- commerce:add_to_cart:v1
- payments:payment_capture:v1
- logistics:shipment_create:v1

## Rule (Non-Negotiable)
Every execution path MUST check capabilityRegistry.isEnabled(...)
before doing work.

## Ownership
Platform Architecture Team

