# ADR-008: CI with GitHub Actions

## Status

Accepted

## Context

The app now has multiple engines and services. Regression checks should run consistently on pushes and pull requests.

## Decision

Add a GitHub Actions workflow that runs `npm install` and `npm run build`.

## Consequences

The repository gains a basic build gate without requiring lint or test jobs yet. Tests can be added to CI later once the project decides to make them mandatory for every change.
