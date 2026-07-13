# ADR-004: Storage Abstraction

## Status

Accepted

## Context

Sprint 2 introduces memory through browser storage, but future storage may move to IndexedDB, SQLite, Firebase, or another backend.

## Decision

All storage access goes through `StorageService` Promise APIs. Pages and components must not call `localStorage` directly.

## Consequences

The current implementation can use `localStorage`, while callers remain insulated from future storage changes.
