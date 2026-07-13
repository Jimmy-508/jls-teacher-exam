# ADR-002: Use Context Instead of Redux

## Status

Accepted

## Context

Sprint 1 to Sprint 3 are pure frontend MVP phases with small interaction scope and local page state.

## Decision

JTEP will not add Redux in the early MVP. Shared behavior should live in services and engines. React state remains local until app-wide state becomes necessary.

## Consequences

The project keeps a small dependency surface. If cross-page state grows, React Context can be introduced before considering Redux or another state library.
