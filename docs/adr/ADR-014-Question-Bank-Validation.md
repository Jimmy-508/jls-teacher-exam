# ADR-014: Question Bank Validation

## Status

Accepted

## Context

JLS currently reads questions from `public/questions.csv`. The question bank is expected to grow across multiple years, subjects, LearningThemes, and KnowledgeNodes. Without validation, CSV mistakes can silently break Today, Practice, Knowledge, and Recommendation behavior.

## Decision

Add a Question Bank validation layer that checks required headers, required row values, unique IDs, choice question option completeness, choice answer validity, and essay option warnings.

Add a Question Bank summary layer that reports counts by year, subject, LearningTheme, KnowledgeNode, and question type. Provide a simple QuestionBank page and a developer report script.

The CSV schema remains unchanged:

- `類別` maps to LearningTheme.
- `知識節點` maps to KnowledgeNode.
- No new theme column is introduced.

## Consequences

JLS can detect unhealthy CSV files before a larger question bank causes hidden failures. Future UI can reuse the validation and summary services without reading localStorage or importing React in services.

The validator does not upload CSV files, persist imported data, or replace the current static `public/questions.csv` source.

