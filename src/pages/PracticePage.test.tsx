import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_QUESTION_COUNT_BY_TYPE,
  EssayPracticeCard,
  PracticeCountSelector,
  PracticeFilterSelector,
  PracticeTypeSelector,
  buildPracticeResultState,
  buildPracticeSettingsSummary,
  canUseRestoredPracticeSession,
  getDefaultQuestionCountForType,
  getDisplayedPracticeQuestionCount,
  getDisplayedQuestionCountSelection,
  getEffectivePracticeQuestionCount,
  normalizeCustomQuestionCount,
  normalizePracticeFiltersForOptions,
  practiceCountOptions,
  sanitizeCustomQuestionCount,
  selectPracticeQuestions,
  updatePracticeSessionEssayCompletion,
} from './PracticePage';
import { CHOICE_QUESTION_TYPE, ESSAY_QUESTION_TYPE } from '../services/questionBankFields';
import { DEFAULT_PRACTICE_FILTERS, filterPracticeQuestions } from '../services/practiceFilterService';
import type { PracticeSession } from '../types/PracticeSession';
import type { SmartFeedbackResult } from '../types/SmartFeedback';
import type { Question } from '../types/question';

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ state: undefined }),
  useNavigate: () => vi.fn(),
}));

describe('PracticePage controls', () => {
  it('shows only choice and essay question type selector options', () => {
    const html = renderToStaticMarkup(<PracticeTypeSelector value="choice" onChange={() => undefined} />);

    expect(html).toContain('choice');
    expect(html).toContain('essay');
    expect(html).not.toContain('all');
  });

  it('shows custom question count option and input', () => {
    const html = renderToStaticMarkup(
      <PracticeCountSelector
        maxCount={25}
        mode="custom"
        value={8}
        onChange={() => undefined}
        onModeChange={() => undefined}
      />,
    );

    expect(html).toContain('value="custom"');
    expect(html).toContain('type="number"');
  });

  it('shows simplified preset question count options', () => {
    expect(practiceCountOptions).toEqual([1, 5, 10, 25]);

    const html = renderToStaticMarkup(
      <PracticeCountSelector
        maxCount={25}
        mode="preset"
        value={5}
        onChange={() => undefined}
        onModeChange={() => undefined}
      />,
    );

    expect(html).toContain('1');
    expect(html).toContain('5');
    expect(html).toContain('10');
    expect(html).toContain('25');
    expect(html).not.toContain('20');
  });

  it('renders all years first before newest-to-oldest year options', () => {
    const html = renderToStaticMarkup(
      <PracticeFilterSelector
        value={{ year: '', subject: '', coreConcept: '', wrongQuestion: 'all' }}
        typeFilter="choice"
        options={{
          years: ['115', '114', '113'],
          subjects: [],
          coreConcepts: [],
        }}
        onChange={() => undefined}
      />,
    );

    expect(html.indexOf('value=""')).toBeLessThan(html.indexOf('115'));
    expect(html.indexOf('115')).toBeLessThan(html.indexOf('114'));
    expect(html.indexOf('114')).toBeLessThan(html.indexOf('113'));
  });

  it('disables wrong-question options for essay practice', () => {
    const choiceHtml = renderToStaticMarkup(
      <PracticeFilterSelector
        value={{ year: '', subject: '', coreConcept: '', wrongQuestion: 'all' }}
        typeFilter="choice"
        options={{ years: [], subjects: [], coreConcepts: [] }}
        onChange={() => undefined}
      />,
    );
    const essayHtml = renderToStaticMarkup(
      <PracticeFilterSelector
        value={{ year: '', subject: '', coreConcept: '', wrongQuestion: 'all' }}
        typeFilter="essay"
        options={{ years: [], subjects: [], coreConcepts: [] }}
        onChange={() => undefined}
      />,
    );

    expect(choiceHtml).toContain('value="wrongOnly"');
    expect(choiceHtml).toContain('value="wrongElimination"');
    expect(choiceHtml).not.toContain('value="wrongOnly" disabled');
    expect(choiceHtml).not.toContain('value="wrongElimination" disabled');
    expect(essayHtml).toContain('value="wrongOnly" disabled');
    expect(essayHtml).toContain('value="wrongElimination" disabled');
  });


  it('renders the practice search row with icon, input, clear, submit, and result text', () => {
    const searchLabel = '\u641c\u5c0b\u984c\u76ee';
    const clearLabel = '\u6e05\u9664\u641c\u5c0b';
    const placeholder = '\u8f38\u5165\u95dc\u9375\u5b57\uff0c\u53ef\u7528\u7a7a\u767d\u5206\u9694';
    const resultText = '\u641c\u5c0b\u300cPiaget\u300d\u30fb\u7b26\u5408 7 \u984c';
    const html = renderToStaticMarkup(
      <PracticeFilterSelector
        value={{ year: '', subject: '', coreConcept: '', wrongQuestion: 'all', searchQuery: 'Piaget' }}
        searchInput="Piaget"
        searchResultCount={7}
        typeFilter="choice"
        options={{ years: [], subjects: [], coreConcepts: [] }}
        onApplySearch={() => undefined}
        onChange={() => undefined}
        onClearSearch={() => undefined}
        onSearchInputChange={() => undefined}
      />,
    );

    expect(html).toContain('practice-search-field');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('type="search"');
    expect(html).toContain('enterKeyHint="search"');
    expect(html).toContain(
      'aria-label="' + searchLabel + '"',
    );
    expect(html).toContain(
      'placeholder="' + placeholder + '"',
    );
    expect(html).toContain(
      'aria-label="' + clearLabel + '"',
    );
    expect(html).toContain(resultText);
    expect(html.match(new RegExp('aria-label=\"' + clearLabel + '\"', 'g'))).toHaveLength(1);
  });

  it('does not show clear button or result text before search is entered or applied', () => {
    const clearLabel = '\u6e05\u9664\u641c\u5c0b';
    const html = renderToStaticMarkup(
      <PracticeFilterSelector
        value={{ year: '', subject: '', coreConcept: '', wrongQuestion: 'all' }}
        searchInput=""
        searchResultCount={0}
        typeFilter="choice"
        options={{ years: [], subjects: [], coreConcepts: [] }}
        onChange={() => undefined}
      />,
    );

    expect(html).not.toContain('aria-label="' + clearLabel + '"');
    expect(html).not.toContain('0 \u984c');
  });

  it('shows typed but unapplied search in the input without showing a result prompt', () => {
    const searchLabel = '\u641c\u5c0b\u984c\u76ee';
    const html = renderToStaticMarkup(
      <PracticeFilterSelector
        value={{ year: '', subject: '', coreConcept: '', wrongQuestion: 'all' }}
        searchInput="Piaget"
        searchResultCount={3}
        typeFilter="choice"
        options={{ years: [], subjects: [], coreConcepts: [] }}
        onChange={() => undefined}
      />,
    );

    expect(html).toContain('value="Piaget"');
    expect(html).toContain('aria-label="' + searchLabel + '"');
    expect(html).not.toContain('Piaget\u300d\u30fb\u7b26\u5408 3');
  });

  it('keeps applied search when another filter changes through the selector', () => {
    const resultText = '\u641c\u5c0b\u300cPiaget\u300d\u30fb\u7b26\u5408 2 \u984c';
    const html = renderToStaticMarkup(
      <PracticeFilterSelector
        value={{ year: '', subject: '', coreConcept: '', wrongQuestion: 'all', searchQuery: 'Piaget' }}
        searchInput="Piaget"
        searchResultCount={2}
        typeFilter="choice"
        options={{ years: ['112'], subjects: [], coreConcepts: [] }}
        onChange={() => undefined}
      />,
    );

    expect(html).toContain(resultText);
    expect(html).toContain('value="112"');
  });

  it('keeps essay wrong-question restrictions when search props are present', () => {
    const resultText = '\u641c\u5c0b\u300cPiaget\u300d\u30fb\u7b26\u5408 2 \u984c';
    const html = renderToStaticMarkup(
      <PracticeFilterSelector
        value={{ year: '112', subject: '', coreConcept: '', wrongQuestion: 'all', searchQuery: 'Piaget' }}
        searchInput="Piaget"
        searchResultCount={2}
        typeFilter="essay"
        options={{ years: ['112'], subjects: [], coreConcepts: [] }}
        onChange={() => undefined}
      />,
    );

    expect(html).toContain(resultText);
    expect(html).toContain('value="wrongOnly" disabled');
    expect(html).toContain('value="wrongElimination" disabled');
  });

  it('resets an invalid subject after year-filtered subject options change', () => {
    const normalizedFilters = normalizePracticeFiltersForOptions(
      { year: '114', subject: '國語文能力測驗', coreConcept: '', wrongQuestion: 'all' },
      [
        createQuestion('Q1', { year: '113', subject: '國語文能力測驗' }),
        createQuestion('Q2', { year: '114', subject: '教育理念與實務' }),
      ],
    );

    expect(normalizedFilters.subject).toBe('');
  });

  it('resets an invalid core concept after year and subject filter options change', () => {
    const normalizedFilters = normalizePracticeFiltersForOptions(
      { year: '114', subject: '教育理念與實務', coreConcept: 'Piaget', wrongQuestion: 'all' },
      [
        createQuestion('Q1', { year: '113', subject: '教育理念與實務', coreConcept: 'Piaget' }),
        createQuestion('Q2', { year: '114', subject: '教育理念與實務', coreConcept: '形成性評量' }),
      ],
    );

    expect(normalizedFilters.coreConcept).toBe('');
  });

  it('custom question count is clamped to the eligible range', () => {
    expect(sanitizeCustomQuestionCount(0, 10)).toBe(1);
    expect(sanitizeCustomQuestionCount(99, 7)).toBe(7);
    expect(sanitizeCustomQuestionCount(20, 25)).toBe(20);
  });

  it('keeps selected question count separate from search eligible count', () => {
    expect(getEffectivePracticeQuestionCount(5, 7)).toBe(5);
    expect(getEffectivePracticeQuestionCount(5, 3)).toBe(3);
    expect(getEffectivePracticeQuestionCount(10, 50)).toBe(10);
    expect(getEffectivePracticeQuestionCount(8, 50)).toBe(8);
    expect(getEffectivePracticeQuestionCount(8, 3)).toBe(3);
  });

  it('uses actual practice count for the settings summary instead of configured preset count', () => {
    const cases = [
      { configuredQuestionCount: 5, eligibleQuestionCount: 38, expectedCount: 5 },
      { configuredQuestionCount: 5, eligibleQuestionCount: 3, expectedCount: 3 },
      { configuredQuestionCount: 10, eligibleQuestionCount: 3, expectedCount: 3 },
      { configuredQuestionCount: 25, eligibleQuestionCount: 19, expectedCount: 19 },
      { configuredQuestionCount: 25, eligibleQuestionCount: 1, expectedCount: 1 },
      { configuredQuestionCount: 25, eligibleQuestionCount: 0, expectedCount: 0 },
    ];

    for (const { configuredQuestionCount, eligibleQuestionCount, expectedCount } of cases) {
      const displayedCount = getDisplayedPracticeQuestionCount({
        configuredQuestionCount,
        eligibleQuestionCount,
      });
      const summary = buildPracticeSettingsSummary({
        typeFilter: 'choice',
        questionCount: displayedCount,
        filters: DEFAULT_PRACTICE_FILTERS,
      });

      expect(displayedCount).toBe(expectedCount);
      expect(summary).toContain(`\u9078\u64c7\u984c\u30fb${expectedCount} \u984c`);
      expect(summary).not.toContain(`\u9078\u64c7\u984c ? ${expectedCount} ?`);
      if (configuredQuestionCount !== expectedCount) {
        expect(summary).not.toContain(`\u9078\u64c7\u984c\u30fb${configuredQuestionCount} \u984c`);
      }
    }
  });

  it('formats the settings summary with middle dots, question unit, and filters', () => {
    const choiceSummary = buildPracticeSettingsSummary({
      typeFilter: 'choice',
      questionCount: 10,
      filters: DEFAULT_PRACTICE_FILTERS,
    });
    const essaySummary = buildPracticeSettingsSummary({
      typeFilter: 'essay',
      questionCount: 1,
      filters: DEFAULT_PRACTICE_FILTERS,
    });
    const filteredSummary = buildPracticeSettingsSummary({
      typeFilter: 'choice',
      questionCount: 5,
      filters: { ...DEFAULT_PRACTICE_FILTERS, year: '115', subject: '\u6559\u80b2\u7406\u5ff5\u8207\u5be6\u52d9' },
    });

    expect(choiceSummary).toContain('\u9078\u64c7\u984c\u30fb10 \u984c');
    expect(choiceSummary).not.toContain('\u9078\u64c7\u984c ? 10 ?');
    expect(essaySummary).toContain('\u975e\u9078\u984c\u30fb1 \u984c');
    expect(filteredSummary).toContain('\u9078\u64c7\u984c\u30fb5 \u984c\u30fb115\u30fb\u6559\u80b2\u7406\u5ff5\u8207\u5be6\u52d9');
    expect(filteredSummary).not.toContain(' ? ');
  });

  it('keeps settings summary count aligned with search result changes and clearing search', () => {
    const searchSummary = buildPracticeSettingsSummary({
      typeFilter: 'choice',
      questionCount: getDisplayedPracticeQuestionCount({ configuredQuestionCount: 10, eligibleQuestionCount: 3 }),
      filters: { ...DEFAULT_PRACTICE_FILTERS, searchQuery: '\u8b1d\u5bcc\u6a02' },
    });
    const clearedSummary = buildPracticeSettingsSummary({
      typeFilter: 'choice',
      questionCount: getDisplayedPracticeQuestionCount({ configuredQuestionCount: getDefaultQuestionCountForType('choice'), eligibleQuestionCount: 38 }),
      filters: DEFAULT_PRACTICE_FILTERS,
    });

    expect(searchSummary).toContain('\u9078\u64c7\u984c\u30fb3 \u984c');
    expect(searchSummary).not.toContain('\u9078\u64c7\u984c ? 3 ?');
    expect(searchSummary).not.toContain('\u9078\u64c7\u984c\u30fb10 \u984c');
    expect(clearedSummary).toContain('\u9078\u64c7\u984c\u30fb5 \u984c');
  });

  it('uses the custom-clamped count for the settings summary', () => {
    const configuredQuestionCount = normalizeCustomQuestionCount({ requestedCount: 40, eligibleQuestionCount: 38 });
    const displayedCount = getDisplayedPracticeQuestionCount({
      configuredQuestionCount,
      eligibleQuestionCount: 38,
    });
    const summary = buildPracticeSettingsSummary({
      typeFilter: 'choice',
      questionCount: displayedCount,
      filters: { ...DEFAULT_PRACTICE_FILTERS, searchQuery: '\u76ae\u4e9e\u5091' },
    });

    expect(configuredQuestionCount).toBe(38);
    expect(displayedCount).toBe(38);
    expect(summary).toContain('\u9078\u64c7\u984c\u30fb38 \u984c');
    expect(summary).not.toContain('\u9078\u64c7\u984c ? 38 ?');
    expect(summary).not.toContain('\u9078\u64c7\u984c\u30fb40 \u984c');
  });
  it('clamps custom question count to the current eligible question count', () => {
    expect(normalizeCustomQuestionCount({ requestedCount: 40, eligibleQuestionCount: 38 })).toBe(38);
    expect(normalizeCustomQuestionCount({ requestedCount: 20, eligibleQuestionCount: 38 })).toBe(20);
    expect(normalizeCustomQuestionCount({ requestedCount: 25, eligibleQuestionCount: 7 })).toBe(7);
    expect(normalizeCustomQuestionCount({ requestedCount: 0, eligibleQuestionCount: 38 })).toBe(1);
    expect(normalizeCustomQuestionCount({ requestedCount: -5, eligibleQuestionCount: 38 })).toBe(1);
    expect(normalizeCustomQuestionCount({ requestedCount: Number.NaN, eligibleQuestionCount: 38 })).toBe(1);
    expect(normalizeCustomQuestionCount({ requestedCount: 40, eligibleQuestionCount: 0 })).toBe(1);
  });

  it('uses the clamped custom count for the configured value, summary, and actual practice set', () => {
    const questions = Array.from({ length: 38 }, (_, index) =>
      createQuestion(`P${index + 1}`, { stem: '\u76ae\u4e9e\u5091 search item' }),
    );
    const filteredQuestions = filterPracticeQuestions(
      questions,
      { ...DEFAULT_PRACTICE_FILTERS, searchQuery: '\u76ae\u4e9e\u5091' },
      'choice',
    );
    const configuredQuestionCount = normalizeCustomQuestionCount({
      requestedCount: 40,
      eligibleQuestionCount: filteredQuestions.length,
    });
    const practiceQuestions = selectPracticeQuestions({
      filteredQuestions,
      loadedQuestions: questions,
      questionCount: getEffectivePracticeQuestionCount(configuredQuestionCount, filteredQuestions.length),
      restoredSession: null,
      typeFilter: 'choice',
    });
    const html = renderToStaticMarkup(
      <PracticeCountSelector
        actualPracticeQuestionCount={practiceQuestions.length}
        maxCount={filteredQuestions.length}
        mode="custom"
        value={configuredQuestionCount}
        onChange={() => undefined}
        onModeChange={() => undefined}
      />,
    );

    expect(filteredQuestions).toHaveLength(38);
    expect(configuredQuestionCount).toBe(38);
    expect(practiceQuestions).toHaveLength(38);
    expect(html).toContain('value="38"');
    expect(html).toMatch(/checked="" value="custom"|value="custom" checked=""/);
    expect(['choice', String(configuredQuestionCount), 'search'].join(' | ')).toContain('38');
  });

  it('keeps custom question count when it is within the eligible range', () => {
    const questions = Array.from({ length: 38 }, (_, index) => createQuestion(`P${index + 1}`));
    const configuredQuestionCount = normalizeCustomQuestionCount({ requestedCount: 20, eligibleQuestionCount: questions.length });
    const practiceQuestions = selectPracticeQuestions({
      filteredQuestions: questions,
      loadedQuestions: questions,
      questionCount: getEffectivePracticeQuestionCount(configuredQuestionCount, questions.length),
      restoredSession: null,
      typeFilter: 'choice',
    });

    expect(configuredQuestionCount).toBe(20);
    expect(practiceQuestions).toHaveLength(20);
  });

  it('keeps preset question count configured even when fewer questions are eligible', () => {
    const questions = Array.from({ length: 7 }, (_, index) => createQuestion(`P${index + 1}`));
    const configuredQuestionCount = 25;
    const practiceQuestions = selectPracticeQuestions({
      filteredQuestions: questions,
      loadedQuestions: questions,
      questionCount: getEffectivePracticeQuestionCount(configuredQuestionCount, questions.length),
      restoredSession: null,
      typeFilter: 'choice',
    });

    expect(configuredQuestionCount).toBe(25);
    expect(practiceQuestions).toHaveLength(7);
  });

  it('keeps a clamped custom value after filters later expand again', () => {
    const narrowedQuestionCount = normalizeCustomQuestionCount({ requestedCount: 40, eligibleQuestionCount: 38 });
    const expandedQuestionCount = normalizeCustomQuestionCount({
      requestedCount: narrowedQuestionCount,
      eligibleQuestionCount: 100,
    });

    expect(narrowedQuestionCount).toBe(38);
    expect(expandedQuestionCount).toBe(38);
  });

  it('derives question count radio selection from actual practice length instead of configured count', () => {
    expect(
      getDisplayedQuestionCountSelection({
        actualPracticeQuestionCount: 3,
        configuredQuestionCount: 5,
        questionCountMode: 'preset',
      }),
    ).toBeNull();
    expect(
      getDisplayedQuestionCountSelection({
        actualPracticeQuestionCount: 7,
        configuredQuestionCount: 25,
        questionCountMode: 'preset',
      }),
    ).toBeNull();
    expect(
      getDisplayedQuestionCountSelection({
        actualPracticeQuestionCount: 1,
        configuredQuestionCount: 25,
        questionCountMode: 'preset',
      }),
    ).toBe(1);
    expect(
      getDisplayedQuestionCountSelection({
        actualPracticeQuestionCount: 5,
        configuredQuestionCount: 10,
        questionCountMode: 'preset',
      }),
    ).toBe(5);
    expect(
      getDisplayedQuestionCountSelection({
        actualPracticeQuestionCount: 8,
        configuredQuestionCount: 8,
        questionCountMode: 'custom',
      }),
    ).toBe('custom');
    expect(
      getDisplayedQuestionCountSelection({
        actualPracticeQuestionCount: 3,
        configuredQuestionCount: 8,
        questionCountMode: 'custom',
      }),
    ).toBeNull();
  });

  it('uses search result count for the prompt but selected count for the actual practice set', () => {
    const questions = Array.from({ length: 7 }, (_, index) =>
      createQuestion(`S${index + 1}`, { stem: '\u6548\u76ca\u8ad6 practice item' }),
    );
    const filteredQuestions = filterPracticeQuestions(
      questions,
      { ...DEFAULT_PRACTICE_FILTERS, searchQuery: '\u6548\u76ca\u8ad6' },
      'choice',
    );
    const effectiveQuestionCount = getEffectivePracticeQuestionCount(5, filteredQuestions.length);
    const practiceQuestions = selectPracticeQuestions({
      filteredQuestions,
      loadedQuestions: questions,
      questionCount: effectiveQuestionCount,
      restoredSession: null,
      typeFilter: 'choice',
    });

    expect(filteredQuestions).toHaveLength(7);
    expect(practiceQuestions).toHaveLength(5);
  });

  it('keeps all matching search results when fewer than the selected question count are eligible', () => {
    const questions = Array.from({ length: 3 }, (_, index) =>
      createQuestion(`S${index + 1}`, { stem: '\u6548\u76ca\u8ad6 practice item' }),
    );
    const filteredQuestions = filterPracticeQuestions(
      questions,
      { ...DEFAULT_PRACTICE_FILTERS, searchQuery: '\u6548\u76ca\u8ad6' },
      'choice',
    );
    const practiceQuestions = selectPracticeQuestions({
      filteredQuestions,
      loadedQuestions: questions,
      questionCount: getEffectivePracticeQuestionCount(5, filteredQuestions.length),
      restoredSession: null,
      typeFilter: 'choice',
    });

    expect(filteredQuestions).toHaveLength(3);
    expect(practiceQuestions).toHaveLength(3);
  });

  it('clears search without carrying over the previous search session length', () => {
    const questions = Array.from({ length: 12 }, (_, index) =>
      createQuestion(`Q${index + 1}`, {
        year: index < 10 ? '115' : '114',
        subject: 'education',
        coreConcept: 'ethics',
        stem: index < 7 ? '\u6548\u76ca\u8ad6 practice item' : 'general practice item',
      }),
    );
    const searchedQuestions = filterPracticeQuestions(
      questions,
      { ...DEFAULT_PRACTICE_FILTERS, year: '115', subject: 'education', coreConcept: 'ethics', searchQuery: '\u6548\u76ca\u8ad6' },
      'choice',
    );
    const clearedFilters = normalizePracticeFiltersForOptions(
      { ...DEFAULT_PRACTICE_FILTERS, year: '115', subject: 'education', coreConcept: 'ethics', searchQuery: '' },
      questions,
    );
    const clearedQuestions = filterPracticeQuestions(questions, clearedFilters, 'choice');
    const clearedPracticeQuestions = selectPracticeQuestions({
      filteredQuestions: clearedQuestions,
      loadedQuestions: questions,
      questionCount: getEffectivePracticeQuestionCount(5, clearedQuestions.length),
      restoredSession: null,
      typeFilter: 'choice',
    });

    expect(searchedQuestions).toHaveLength(7);
    expect(clearedFilters).toMatchObject({ year: '115', subject: 'education', coreConcept: 'ethics', wrongQuestion: 'all', searchQuery: '' });
    expect(clearedQuestions).toHaveLength(10);
    expect(clearedPracticeQuestions).toHaveLength(5);
  });

  it('does not restore a previous longer search session after search is cleared', () => {
    const loadedQuestions = Array.from({ length: 12 }, (_, index) => createQuestion(`Q${index + 1}`));
    const previousSearchSession = {
      ...createSession(),
      questionIds: loadedQuestions.slice(0, 7).map((question) => question.id),
    };

    expect(
      canUseRestoredPracticeSession(
        previousSearchSession,
        loadedQuestions,
        'choice',
        false,
        loadedQuestions,
        getEffectivePracticeQuestionCount(5, loadedQuestions.length),
      ),
    ).toBe(false);
  });

  it('resets configured question count to the current type default when search is cleared', () => {
    expect(getDefaultQuestionCountForType('choice')).toBe(5);
    expect(getDefaultQuestionCountForType('essay')).toBe(1);

    const questions = Array.from({ length: 12 }, (_, index) =>
      createQuestion(`Q${index + 1}`, { stem: index < 7 ? '\u6548\u76ca\u8ad6 practice item' : 'general practice item' }),
    );
    const searchedQuestions = filterPracticeQuestions(
      questions,
      { ...DEFAULT_PRACTICE_FILTERS, searchQuery: '\u6548\u76ca\u8ad6' },
      'choice',
    );
    const searchPracticeQuestions = selectPracticeQuestions({
      filteredQuestions: searchedQuestions,
      loadedQuestions: questions,
      questionCount: getEffectivePracticeQuestionCount(25, searchedQuestions.length),
      restoredSession: null,
      typeFilter: 'choice',
    });
    const clearedQuestions = filterPracticeQuestions(questions, { ...DEFAULT_PRACTICE_FILTERS, searchQuery: '' }, 'choice');
    const clearedConfiguredQuestionCount = getDefaultQuestionCountForType('choice');
    const clearedPracticeQuestions = selectPracticeQuestions({
      filteredQuestions: clearedQuestions,
      loadedQuestions: questions,
      questionCount: getEffectivePracticeQuestionCount(clearedConfiguredQuestionCount, clearedQuestions.length),
      restoredSession: null,
      typeFilter: 'choice',
    });

    expect(searchedQuestions).toHaveLength(7);
    expect(searchPracticeQuestions).toHaveLength(7);
    expect(clearedConfiguredQuestionCount).toBe(5);
    expect(clearedPracticeQuestions).toHaveLength(5);
  });

  it('does not check the configured preset when the actual practice count is clamped to a non-preset value', () => {
    const questions = Array.from({ length: 3 }, (_, index) => createQuestion(`Q${index + 1}`));
    const clearedConfiguredQuestionCount = getDefaultQuestionCountForType('choice');
    const clearedPracticeQuestions = selectPracticeQuestions({
      filteredQuestions: questions,
      loadedQuestions: questions,
      questionCount: getEffectivePracticeQuestionCount(clearedConfiguredQuestionCount, questions.length),
      restoredSession: null,
      typeFilter: 'choice',
    });
    const html = renderToStaticMarkup(
      <PracticeCountSelector
        maxCount={25}
        actualPracticeQuestionCount={clearedPracticeQuestions.length}
        mode="preset"
        value={clearedConfiguredQuestionCount}
        onChange={() => undefined}
        onModeChange={() => undefined}
      />,
    );

    expect(clearedConfiguredQuestionCount).toBe(5);
    expect(clearedPracticeQuestions).toHaveLength(3);
    expect(html).not.toContain('checked=""');
  });

  it('resets essay search clearing to the essay default question count', () => {
    const essayQuestions = Array.from({ length: 4 }, (_, index) =>
      createQuestion(`E${index + 1}`, { type: ESSAY_QUESTION_TYPE, stem: '\u6548\u76ca\u8ad6 essay item' }),
    );
    const searchedQuestions = filterPracticeQuestions(
      essayQuestions,
      { ...DEFAULT_PRACTICE_FILTERS, searchQuery: '\u6548\u76ca\u8ad6' },
      'essay',
    );
    const searchPracticeQuestions = selectPracticeQuestions({
      filteredQuestions: searchedQuestions,
      loadedQuestions: essayQuestions,
      questionCount: getEffectivePracticeQuestionCount(25, searchedQuestions.length),
      restoredSession: null,
      typeFilter: 'essay',
    });
    const clearedConfiguredQuestionCount = getDefaultQuestionCountForType('essay');
    const clearedPracticeQuestions = selectPracticeQuestions({
      filteredQuestions: searchedQuestions,
      loadedQuestions: essayQuestions,
      questionCount: getEffectivePracticeQuestionCount(clearedConfiguredQuestionCount, searchedQuestions.length),
      restoredSession: null,
      typeFilter: 'essay',
    });

    expect(searchPracticeQuestions).toHaveLength(4);
    expect(clearedConfiguredQuestionCount).toBe(1);
    expect(clearedPracticeQuestions).toHaveLength(1);
  });

  it('uses sensible default question counts by type', () => {
    expect(DEFAULT_QUESTION_COUNT_BY_TYPE.choice).toBe(5);
    expect(DEFAULT_QUESTION_COUNT_BY_TYPE.essay).toBe(1);
  });

  it('restores a valid session only for normal choice practice', () => {
    expect(canUseRestoredPracticeSession(createSession(), [createQuestion('Q1')], 'choice', false)).toBe(true);
    expect(canUseRestoredPracticeSession(createSession(), [createQuestion('Q1')], 'essay', false)).toBe(false);
    expect(canUseRestoredPracticeSession(createSession(), [createQuestion('Q1')], 'choice', true)).toBe(false);
  });

  it('does not restore a session when the selected question count changes', () => {
    expect(
      canUseRestoredPracticeSession(
        createSession(),
        [createQuestion('Q1'), createQuestion('Q2'), createQuestion('Q3')],
        'choice',
        false,
        [createQuestion('Q1'), createQuestion('Q2'), createQuestion('Q3')],
        3,
      ),
    ).toBe(false);
  });

  it('keeps Knowledge questionIds as the practice scope when switching question types', () => {
    const loadedQuestions = [
      createQuestion('C1', { type: CHOICE_QUESTION_TYPE }),
      createQuestion('E1', { type: ESSAY_QUESTION_TYPE }),
      createQuestion('C2', { type: CHOICE_QUESTION_TYPE }),
      createQuestion('E2', { type: ESSAY_QUESTION_TYPE }),
    ];
    const requestedQuestionIds = ['C1', 'E1'];

    expect(
      selectPracticeQuestions({
        filteredQuestions: loadedQuestions,
        loadedQuestions,
        questionCount: 5,
        requestedQuestionIds,
        restoredSession: null,
        typeFilter: 'choice',
      }).map((question) => question.id),
    ).toEqual(['C1']);
    expect(
      selectPracticeQuestions({
        filteredQuestions: loadedQuestions,
        loadedQuestions,
        questionCount: 5,
        requestedQuestionIds,
        restoredSession: null,
        typeFilter: 'essay',
      }).map((question) => question.id),
    ).toEqual(['E1']);
  });

  it('shows reference answer before essay answer is submitted', () => {
    const html = renderToStaticMarkup(
      <EssayPracticeCard
        answer=""
        errorMessage=""
        isGeneratingFeedback={false}
        isLastQuestion={false}
        onAnswerChange={() => undefined}
        onNext={() => undefined}
        onSubmit={() => undefined}
        question={createEssayQuestion()}
      />,
    );

    expect(html).toContain('參考答案');
    expect(html).toContain('非選參考答案內容');
    expect(html).not.toContain('作答回饋參考');
  });

  it('shows feedback first and only one reference answer block after essay submit', () => {
    const html = renderToStaticMarkup(
      <EssayPracticeCard
        answer="我的答案"
        errorMessage=""
        feedback={createFeedback()}
        isGeneratingFeedback={false}
        isLastQuestion={false}
        onAnswerChange={() => undefined}
        onNext={() => undefined}
        onSubmit={() => undefined}
        question={createEssayQuestion()}
      />,
    );

    expect(html).toContain('作答回饋參考');
    expect(html.indexOf('作答回饋參考')).toBeLessThan(html.indexOf('參考答案'));
    expect(html.match(/參考答案/g)).toHaveLength(1);
  });

  it('builds essay result state from average smart feedback levels', () => {
    const result = buildPracticeResultState({
      questions: [createEssayQuestion('E1'), createEssayQuestion('E2')],
      answers: [],
      essayFeedback: {
        E1: createFeedback(4),
        E2: createFeedback(2),
      },
      questionType: 'essay',
    });

    expect(result).toEqual({
      totalCount: 2,
      correctCount: 0,
      wrongCount: 0,
      gradableCount: 0,
      questionType: ESSAY_QUESTION_TYPE,
      averageFeedbackLevel: 3,
    });
  });

  it('builds choice result state without essay feedback average', () => {
    const result = buildPracticeResultState({
      questions: [createQuestion('C1'), createQuestion('C2')],
      answers: [
        { questionId: 'C1', selectedAnswer: 'A', correctAnswer: 'A', isCorrect: true },
        { questionId: 'C2', selectedAnswer: 'B', correctAnswer: 'A', isCorrect: false },
      ],
      essayFeedback: {},
      questionType: 'choice',
    });

    expect(result).toEqual({
      totalCount: 2,
      correctCount: 1,
      wrongCount: 1,
      gradableCount: 2,
      questionType: CHOICE_QUESTION_TYPE,
    });
  });

  it('does not count the same completed essay question twice', () => {
    const firstSession = updatePracticeSessionEssayCompletion(createSession(), 'E1');
    const secondSession = updatePracticeSessionEssayCompletion(firstSession, 'E1');

    expect(firstSession.completedEssayCount).toBe(1);
    expect(firstSession.completedEssayQuestionIds).toEqual(['E1']);
    expect(secondSession).toBe(firstSession);
    expect(secondSession.completedEssayCount).toBe(1);
    expect(secondSession.completedEssayQuestionIds).toEqual(['E1']);
  });
});

function createSession(): PracticeSession {
  return {
    id: 'session-1',
    startTime: '2026-07-07T00:00:00.000Z',
    totalQuestions: 1,
    correctCount: 0,
    wrongCount: 0,
    accuracy: 0,
    durationSeconds: 0,
    questionType: CHOICE_QUESTION_TYPE,
    questionIds: ['Q1'],
    currentIndex: 0,
    answers: [],
    status: 'active',
  };
}

function createQuestion(id: string, overrides: Partial<Question> = {}): Question {
  return {
    id,
    year: '113',
    category: 'teacher',
    subject: 'education',
    questionNumber: '1',
    type: CHOICE_QUESTION_TYPE,
    score: 1,
    group: 'theme',
    learningTheme: 'theme',
    knowledgeNode: 'node',
    stem: 'Question',
    optionA: 'A',
    optionB: 'B',
    optionC: 'C',
    optionD: 'D',
    correctAnswer: 'A',
    ...overrides,
  };
}

function createEssayQuestion(id = 'E1'): Question {
  return {
    ...createQuestion(id),
    type: ESSAY_QUESTION_TYPE,
    score: 10,
    essayReferenceAnswer: '非選參考答案內容',
  };
}

function createFeedback(level: 1 | 2 | 3 | 4 | 5 = 4): SmartFeedbackResult {
  return {
    level,
    summary: '已有核心概念。',
    coveredConcepts: [],
    missingConcepts: [],
    matchedBonusConcepts: [],
    suggestedBonusConcepts: [],
  };
}
