import type { ConceptAliasGroup } from '../../types/SmartFeedback';

export function parseConcepts(value: string | undefined): string[] {
  const normalizedValue = value?.trim();

  if (!normalizedValue) {
    return [];
  }

  return splitMultiValue(normalizedValue);
}

export function parsePipeList(value: string | undefined): string[] {
  return splitMultiValue(value ?? '');
}

export function parseAliasGroups(value: string | undefined, fallbackConcepts: readonly string[] = []): ConceptAliasGroup[] {
  const groups = splitAliasGroupValues(value ?? '').map((groupText) => {
    const [canonicalText, aliasesText = ''] = groupText.split('=');
    const canonical = canonicalText.trim();
    const aliases = aliasesText
      .split('/')
      .map((alias) => alias.trim())
      .filter(Boolean);

    return canonical ? { canonical, aliases } : null;
  });
  const parsedGroups = groups.filter((group): group is ConceptAliasGroup => Boolean(group));
  const knownCanonicals = new Set(parsedGroups.map((group) => group.canonical));
  const fallbackGroups = fallbackConcepts
    .filter((concept) => concept && !knownCanonicals.has(concept))
    .map((concept) => ({ canonical: concept, aliases: [] }));

  return [...parsedGroups, ...fallbackGroups];
}

function splitMultiValue(value: string): string[] {
  return value
    .split(/[|\n；;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitAliasGroupValues(value: string): string[] {
  return value
    .split(/[|\n；;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
