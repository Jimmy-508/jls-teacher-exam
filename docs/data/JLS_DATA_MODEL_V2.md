# JLS Data Model v2

Version: v0.5.6

## Reason For Upgrade

The Knowledge Node diagnostic showed that the current CSV can produce one KnowledgeNode per question. That is correct for fine-grained diagnosis, but too granular for Today Focus.

Data Model v2 separates the daily learning unit from the diagnostic unit:

```text
Course
→ LearningTheme
→ KnowledgeNode
→ Question
```

## LearningTheme

LearningTheme is the broader learning unit used for:

- Today Focus
- Practice
- Review
- Analytics
- Learning Recommendation

In CSV v2, the existing `類別` column maps to `learningTheme`.

## KnowledgeNode

KnowledgeNode remains the finer concept used for:

- Knowledge coverage
- Answer analysis
- AI feedback
- Gap analysis
- Familiarity tracking

In CSV v2, the existing `知識節點` column remains `knowledgeNode`.

## CSV Mapping

No new CSV column is required yet.

```text
類別     -> learningTheme
類別     -> group          (legacy compatibility)
知識節點 -> knowledgeNode
```

## Example

```text
LearningTheme: 教學評量
  KnowledgeNode: 形成性評量
  KnowledgeNode: 信度
  Question IDs: Q002, Q005
```

Today should prefer LearningTheme so it can build a meaningful practice set. KnowledgeNode remains available for detailed diagnosis.
