# Knowledge Node Diagnostic Report

## 1. Knowledge Node Summary

### 教育目的

1 Question

IDs:

- Q001

### 形成性評量

1 Question

IDs:

- Q002

### 正向管教

1 Question

IDs:

- Q003

### 鷹架理論

1 Question

IDs:

- Q004

### 信度

1 Question

IDs:

- Q005

### 校本課程

1 Question

IDs:

- Q006

## 2. Small Knowledge Nodes

Knowledge Nodes containing fewer than 3 questions:

- 教育目的: 1 question, IDs: Q001
- 形成性評量: 1 question, IDs: Q002
- 正向管教: 1 question, IDs: Q003
- 鷹架理論: 1 question, IDs: Q004
- 信度: 1 question, IDs: Q005
- 校本課程: 1 question, IDs: Q006

## 3. Singleton Knowledge Nodes

Knowledge Nodes containing exactly 1 question:

- 教育目的: Q001
- 形成性評量: Q002
- 正向管教: Q003
- 鷹架理論: Q004
- 信度: Q005
- 校本課程: Q006

All current Knowledge Nodes are singleton nodes.

## 4. Today's Focus Analysis

Current visible PracticePage state:

- URL: `/practice`
- Progress: 第 1 題 / 共 1 題
- Visible question metadata:
  - 年度: 112
  - 科目: 班級經營
  - Knowledge Node: 正向管教
  - 題號: 3

Today's Focus selected node:

- 正向管教

Question Count:

- 1 question

Question IDs:

- Q003

Reason selected:

- PracticePage does not preserve the TodayFocus `reason` string after navigation.
- Based on `TodayEngine.getTodayFocus()`, a node can be selected by this priority order:
  1. Highest recent error rate
  2. Longest time since review
  3. Lowest average familiarity
  4. Fallback node with available questions
- The current visible focus is `正向管教 / Q003`. Since this node has only one question in the generated KnowledgeNode, Today practice can only contain one question regardless of which priority rule selected it.

## 5. Root Cause Analysis

### A. TodayEngine only selects one question.

False.

Evidence:

- `TodayEngine` limits focus questions with `questionIds.slice(0, TODAY_QUESTION_LIMIT)`.
- `TODAY_QUESTION_LIMIT` is 5.
- Therefore, TodayEngine is capable of selecting up to 5 questions when the selected KnowledgeNode contains at least 5 available choice questions.

### B. KnowledgeService generates only one question.

False.

Evidence:

- `KnowledgeService.buildKnowledgeNodes()` iterates over all questions.
- It pushes each question ID into a node accumulator:
  - `currentNode.questionIds.push(question.id)`
- The service generated 6 Knowledge Nodes from 6 CSV rows.
- It is not dropping the other questions globally.

### C. KnowledgeNode contains only one question.

True as the immediate symptom.

Evidence:

- The selected node `正向管教` contains only `Q003`.
- Every other generated KnowledgeNode also contains exactly one question.

### D. CSV structure causes fragmented knowledge nodes.

True as the primary root cause.

Evidence:

- `Question.knowledgeNode` is loaded directly from the CSV.
- `KnowledgeService.buildKnowledgeNodes()` groups by the exact `question.knowledgeNode` string.
- The current CSV has 6 rows and 6 distinct Knowledge Node values:
  - 教育目的
  - 形成性評量
  - 正向管教
  - 鷹架理論
  - 信度
  - 校本課程
- Because each CSV row has a unique Knowledge Node, the generated Knowledge Layer is fragmented into singleton nodes.

Conclusion:

The primary root cause is **D. CSV structure causes fragmented knowledge nodes**.

`C. KnowledgeNode contains only one question` is also true, but it is the result of the CSV fragmentation rather than the deeper cause.

## 6. Recommendation

Recommended option: **Option C — Introduce LearningTheme layer**.

### Why

`KnowledgeNode` is currently very granular. That can be useful later for precise diagnosis, but it is too small for Today Focus when every node maps to one question.

A `LearningTheme` layer would sit above KnowledgeNode:

- LearningTheme: broader learning area for Today Focus and daily planning
- KnowledgeNode: precise concept for diagnostics, explanation, and future analytics

Example:

- LearningTheme: 教學與評量
  - KnowledgeNode: 形成性評量
  - KnowledgeNode: 信度
- LearningTheme: 班級經營
  - KnowledgeNode: 正向管教

### Pros

- Today can recommend a meaningful 3-5 question practice set.
- KnowledgeNode can remain precise and immutable from CSV.
- Future analytics can show both broad themes and detailed weak concepts.
- Avoids forcing CSV authors to make every `知識節點` artificially broad.

### Cons

- Requires a new derived model and mapping rule.
- Needs a strategy for assigning KnowledgeNodes to LearningThemes.
- Adds one more domain layer to explain and test.

## Alternative Options

### Option A — Keep KnowledgeNode

Pros:

- No domain change.
- Keeps the current model simple.

Cons:

- Today Focus will keep producing one-question sessions when nodes are singleton.
- The user experience remains too narrow for daily practice.

### Option B — Merge similar KnowledgeNodes

Pros:

- Can increase question count per focus.
- May be easier than adding a full new layer.

Cons:

- Risks losing the precision of KnowledgeNode.
- Similarity rules can become ambiguous.
- Merging by string similarity may create unstable results.

### Option D — Other

Possible path:

- Add a CSV field such as `主題` or `LearningTheme`.

Pros:

- Gives content authors direct control.
- Keeps app logic simpler.

Cons:

- Requires CSV schema expansion.
- Existing CSV files need migration.

