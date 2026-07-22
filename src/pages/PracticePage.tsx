import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ProgressBar from '../components/ProgressBar';
import QuestionCard from '../components/QuestionCard';
import ReferenceAnswerPanel from '../components/ReferenceAnswerPanel';
import SmartFeedbackPanel from '../components/SmartFeedbackPanel';
import { loadQuestions } from '../services/csvService';
import { getLearningThemeDisplayName } from '../services/displayDictionary';
import { normalizeSubjectName } from '../constants/subjectOrder';
import { buildOfflineChoiceExplanation } from '../services/offlineExplanationService';
import {
  ACTIVE_PRACTICE_SESSION_STORAGE_KEY,
  LAST_PRACTICE_SESSION_STORAGE_KEY,
  LEARNING_PROFILE_STORAGE_KEY,
  LEARNING_RECORDS_STORAGE_KEY,
  calculateLearningProfile,
  canRestorePracticeSession,
  createPracticeSession,
  ensureLearningRecords,
  restoreSessionQuestions,
  updateLearningRecord,
  updatePracticeSessionAnswer,
  updatePracticeSessionCurrentIndex,
} from '../services/learningEngine';
import {
  DEFAULT_PRACTICE_FILTERS,
  buildPracticeFilterOptionsForFilters,
  filterPracticeQuestions,
  hasActivePracticeFilters,
  normalizePracticeSearchQuery,
  normalizeWrongQuestionFilterForType,
  summarizePracticeFilters,
  type PracticeFilters,
} from '../services/practiceFilterService';
import { analyzeSmartFeedback } from '../services/smartFeedback/SmartFeedbackEngine';
import { calculateAverageFeedbackLevel } from '../services/smartFeedback/feedbackLevel';
import {
  checkAnswer,
  drawPracticeQuestions,
  drawPracticeQuestionsByIds,
  drawPracticeQuestionsByLearningTheme,
  normalizeChoiceKey,
  type PracticeQuestionCount,
  type PracticeQuestionTypeFilter,
} from '../services/questionEngine';
import { CHOICE_QUESTION_TYPE, ESSAY_QUESTION_TYPE } from '../services/questionBankFields';
import { buildQuestionContentHash, buildQuestionLogicalKey } from '../services/questionBankIdentityService';
import { load, remove, save } from '../services/storageService';
import type { ChoiceExplanation } from '../types/ChoiceExplanation';
import type { LearningRecord } from '../types/LearningRecord';
import type { PracticeSession } from '../types/PracticeSession';
import type { SmartFeedbackResult } from '../types/SmartFeedback';
import type { ChoiceKey, PracticeAnswer, Question, QuestionType } from '../types/question';

interface ResultState {
  totalCount: number;
  correctCount: number;
  wrongCount: number;
  gradableCount: number;
  questionType?: QuestionType;
  averageFeedbackLevel?: 1 | 2 | 3 | 4 | 5;
}

interface PracticeLocationState {
  coreConcept?: string;
  knowledgeNode?: string;
  learningTheme?: string;
  subject?: string;
  questionIds?: string[];
  fromToday?: boolean;
  fromTodayRecommendation?: boolean;
}

export function buildPracticeResultState(params: {
  questions: readonly Question[];
  answers: readonly PracticeAnswer[];
  essayFeedback: Record<string, SmartFeedbackResult>;
  questionType: PracticeQuestionTypeFilter;
}): ResultState {
  if (params.questionType === 'essay') {
    const feedbackLevels = params.questions
      .map((question) => params.essayFeedback[question.id]?.level)
      .filter((level): level is 1 | 2 | 3 | 4 | 5 => typeof level === 'number');
    const averageFeedbackLevel = calculateAverageFeedbackLevel(feedbackLevels);

    return {
      totalCount: params.questions.length,
      correctCount: 0,
      wrongCount: 0,
      gradableCount: 0,
      questionType: ESSAY_QUESTION_TYPE,
      averageFeedbackLevel: averageFeedbackLevel ?? undefined,
    };
  }

  const gradableAnswers = params.answers.filter((answer) => answer.isGradable !== false);
  const correctCount = gradableAnswers.filter((answer) => answer.isCorrect).length;

  return {
    totalCount: params.questions.length,
    correctCount,
    wrongCount: gradableAnswers.length - correctCount,
    gradableCount: gradableAnswers.length,
    questionType: CHOICE_QUESTION_TYPE,
  };
}

export function updatePracticeSessionEssayCompletion(session: PracticeSession, questionId: string): PracticeSession {
  const completedEssayQuestionIds = session.completedEssayQuestionIds ?? [];

  if (completedEssayQuestionIds.includes(questionId)) {
    return session;
  }

  const nextCompletedEssayQuestionIds = [...completedEssayQuestionIds, questionId];

  return {
    ...session,
    completedEssayQuestionIds: nextCompletedEssayQuestionIds,
    completedEssayCount: nextCompletedEssayQuestionIds.length,
  };
}

export const practiceTypeOptions: Array<{ label: string; value: PracticeQuestionTypeFilter }> = [
  { label: '選擇題', value: 'choice' },
  { label: '非選題', value: 'essay' },
];
export const practiceCountOptions: PracticeQuestionCount[] = [1, 5, 10, 25];
export const DEFAULT_QUESTION_COUNT_BY_TYPE = {
  choice: 5,
  essay: 1,
  all: 5,
} as const satisfies Record<PracticeQuestionTypeFilter, PracticeQuestionCount>;

export function getDefaultQuestionCountForType(typeFilter: PracticeQuestionTypeFilter): PracticeQuestionCount {
  return DEFAULT_QUESTION_COUNT_BY_TYPE[typeFilter];
}
export type PracticeCountMode = 'preset' | 'custom';

function isPracticeLocationState(value: unknown): value is PracticeLocationState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const state = value as Partial<PracticeLocationState>;
  return (
    (typeof state.coreConcept === 'string' || typeof state.coreConcept === 'undefined') &&
    (typeof state.knowledgeNode === 'string' || typeof state.knowledgeNode === 'undefined') &&
    (typeof state.learningTheme === 'string' || typeof state.learningTheme === 'undefined') &&
    (typeof state.subject === 'string' || typeof state.subject === 'undefined') &&
    (Array.isArray(state.questionIds) || typeof state.questionIds === 'undefined') &&
    (typeof state.fromToday === 'boolean' || typeof state.fromToday === 'undefined') &&
    (typeof state.fromTodayRecommendation === 'boolean' || typeof state.fromTodayRecommendation === 'undefined')
  );
}

export default function PracticePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const practiceLocationState = isPracticeLocationState(location.state) ? location.state : {};
  const requestedCoreConcept = practiceLocationState.coreConcept ?? practiceLocationState.knowledgeNode;
  const requestedLearningTheme = practiceLocationState.learningTheme;
  const requestedSubject = practiceLocationState.subject;
  const requestedQuestionIds = practiceLocationState.questionIds;
  const [typeFilter, setTypeFilter] = useState<PracticeQuestionTypeFilter>('choice');
  const [filters, setFilters] = useState<PracticeFilters>(() => ({
    ...DEFAULT_PRACTICE_FILTERS,
    subject: requestedSubject ?? '',
    coreConcept: requestedCoreConcept ?? '',
  }));
  const [searchInput, setSearchInput] = useState('');
  const [questionCount, setQuestionCount] = useState<PracticeQuestionCount>(5);
  const [questionCountMode, setQuestionCountMode] = useState<PracticeCountMode>('preset');
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [learningRecords, setLearningRecords] = useState<Record<string, LearningRecord>>({});
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<PracticeAnswer[]>([]);
  const [practiceSession, setPracticeSession] = useState<PracticeSession | null>(null);
  const [explanations, setExplanations] = useState<Record<string, ChoiceExplanation>>({});
  const [essayAnswers, setEssayAnswers] = useState<Record<string, string>>({});
  const [essayFeedback, setEssayFeedback] = useState<Record<string, SmartFeedbackResult>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnswerSaving, setIsAnswerSaving] = useState(false);
  const [isExplanationLoading, setIsExplanationLoading] = useState(false);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [eliminationMessage, setEliminationMessage] = useState<ReactNode>(null);

  useEffect(() => {
    setFilters((previousFilters) => ({
      ...previousFilters,
      subject: requestedSubject ?? previousFilters.subject,
      coreConcept: requestedCoreConcept ?? previousFilters.coreConcept,
    }));
  }, [requestedCoreConcept, requestedSubject]);

  useEffect(() => {
    let isMounted = true;

    async function initializePractice() {
      setIsLoading(true);
      setErrorMessage('');

      try {
        const loadedQuestions = await loadQuestions();
        const savedRecords = (await load<Record<string, LearningRecord>>(LEARNING_RECORDS_STORAGE_KEY)) ?? {};
        const filteredQuestions = selectFilteredQuestions(loadedQuestions, savedRecords);
        const effectiveQuestionCount = getEffectivePracticeQuestionCount(questionCount, filteredQuestions.length);
        const savedSession = await load<PracticeSession>(ACTIVE_PRACTICE_SESSION_STORAGE_KEY);
        const shouldStartFocusedPractice = Boolean(
          requestedLearningTheme || requestedSubject || requestedCoreConcept || requestedQuestionIds?.length || hasActivePracticeFilters(filters),
        );
        const restoredSession =
          canUseRestoredPracticeSession(
            savedSession,
            loadedQuestions,
            typeFilter,
            shouldStartFocusedPractice,
            filteredQuestions,
            effectiveQuestionCount,
          )
            ? savedSession
            : null;
        const practiceQuestions = selectPracticeQuestions({
          filteredQuestions,
          loadedQuestions,
          questionCount: effectiveQuestionCount,
          requestedLearningTheme,
          requestedQuestionIds,
          requestedSubject,
          restoredSession,
          typeFilter,
        });

        if (practiceQuestions.length === 0) {
          if (isMounted) {
            setAllQuestions(loadedQuestions);
            setLearningRecords(savedRecords);
            setQuestions([]);
            setPracticeSession(null);
            setAnswers([]);
            setCurrentIndex(0);
          }
          return;
        }

        const session =
          restoredSession ??
          createPracticeSession(
            practiceQuestions.map((question) => question.id),
            filters.wrongQuestion === 'wrongElimination' && typeFilter === 'choice' ? 'wrongElimination' : 'standard',
          );
        const initializedRecords = ensureLearningRecords(savedRecords, practiceQuestions);

        await save(LEARNING_RECORDS_STORAGE_KEY, initializedRecords);
        await save(ACTIVE_PRACTICE_SESSION_STORAGE_KEY, session);

        if (!isMounted) {
          return;
        }

        setQuestions(practiceQuestions);
        setAllQuestions(loadedQuestions);
        setLearningRecords(initializedRecords);
        setAnswers(session.answers);
        setPracticeSession(session);
        setCurrentIndex(Math.min(session.currentIndex, practiceQuestions.length - 1));
        setExplanations({});
        setEssayAnswers({});
        setEssayFeedback({});
        setEliminationMessage(null);
      } catch (error: unknown) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : 'Practice 載入失敗。');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void initializePractice();

    return () => {
      isMounted = false;
    };
  }, [requestedCoreConcept, requestedLearningTheme, requestedQuestionIds, requestedSubject, typeFilter, questionCount, filters]);

  const filterOptions = useMemo(
    () => buildPracticeFilterOptionsForFilters(allQuestions, filters),
    [allQuestions, filters],
  );
  const eligibleQuestionCount = useMemo(
    () => filterPracticeQuestions(allQuestions, filters, typeFilter, learningRecords).length,
    // Keep answer-state updates from rerunning the full text search while the user is answering.
    // The count is refreshed when the question bank, filters, type, or applied search query changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allQuestions, filters, typeFilter],
  );

  useEffect(() => {
    if (questionCountMode !== 'custom' || eligibleQuestionCount <= 0) {
      return;
    }

    const normalizedQuestionCount = normalizeCustomQuestionCount({
      requestedCount: questionCount,
      eligibleQuestionCount,
    });

    if (normalizedQuestionCount === questionCount) {
      return;
    }

    void resetCurrentPracticeState();
    setQuestionCount(normalizedQuestionCount);
  }, [eligibleQuestionCount, questionCount, questionCountMode]);
  const currentQuestion = questions[currentIndex];
  const currentAnswer = useMemo(
    () => answers.find((answer) => answer.questionId === currentQuestion?.id),
    [answers, currentQuestion],
  );
  const currentExplanation = currentQuestion ? explanations[currentQuestion.id] : undefined;
  const currentEssayAnswer = currentQuestion ? essayAnswers[currentQuestion.id] ?? '' : '';
  const currentEssayFeedback = currentQuestion ? essayFeedback[currentQuestion.id] : undefined;
  const isEssayQuestion = currentQuestion?.type === ESSAY_QUESTION_TYPE;
  const requestedQuestionPool = useMemo(
    () => getRequestedQuestionPool(allQuestions, requestedQuestionIds),
    [allQuestions, requestedQuestionIds],
  );
  const emptyPracticeMessage = getEmptyPracticeMessage(typeFilter, requestedQuestionPool, filters.searchQuery);
  const displayedPracticeQuestionCount = getDisplayedPracticeQuestionCount({
    configuredQuestionCount: questionCount,
    eligibleQuestionCount,
  });
  const settingsSummary = buildPracticeSettingsSummary({
    typeFilter,
    questionCount: displayedPracticeQuestionCount,
    filters,
  });

  function selectFilteredQuestions(loadedQuestions: readonly Question[], savedRecords: Record<string, LearningRecord>): Question[] {
    return filterPracticeQuestions(loadedQuestions, filters, typeFilter, savedRecords);
  }

  async function persistAnswer(answer: PracticeAnswer) {
    if (!practiceSession) {
      return;
    }

    const savedRecords = (await load<Record<string, LearningRecord>>(LEARNING_RECORDS_STORAGE_KEY)) ?? {};
    const nextRecord = updateLearningRecord(savedRecords[answer.questionId], answer);
    const answeredQuestion = questions.find((question) => question.id === answer.questionId);
    const shouldClearWrongCount =
      answer.isGradable === false ||
      (answeredQuestion?.type === CHOICE_QUESTION_TYPE && !normalizeChoiceKey(answeredQuestion.correctAnswer)) ||
      (practiceSession.mode === 'wrongElimination' && answer.isCorrect);
    const recordWithIdentity: LearningRecord = answeredQuestion
      ? {
          ...nextRecord,
          wrongCount: shouldClearWrongCount ? 0 : nextRecord.wrongCount,
          questionIdentity: {
            identityVersion: 1,
            logicalKey: buildQuestionLogicalKey(answeredQuestion),
            contentHash: await buildQuestionContentHash(answeredQuestion),
          },
        }
      : shouldClearWrongCount
        ? { ...nextRecord, wrongCount: 0 }
        : nextRecord;
    const nextRecords = {
      ...savedRecords,
      [answer.questionId]: recordWithIdentity,
    };
    const answeredRemainingQuestionIds = practiceSession.remainingQuestionIds ?? practiceSession.questionIds;
    const nextRemainingQuestionIds =
      practiceSession.mode === 'wrongElimination' && answer.isCorrect
        ? answeredRemainingQuestionIds.filter((questionId) => questionId !== answer.questionId)
        : answeredRemainingQuestionIds;
    const nextSession = {
      ...updatePracticeSessionAnswer(practiceSession, answer),
      remainingQuestionIds: practiceSession.mode === 'wrongElimination' ? nextRemainingQuestionIds : practiceSession.remainingQuestionIds,
      attemptCount: practiceSession.mode === 'wrongElimination' ? (practiceSession.attemptCount ?? 0) + 1 : practiceSession.attemptCount,
    };
    const learningProfile = calculateLearningProfile(Object.values(nextRecords), recordWithIdentity.lastReview);

    await save(LEARNING_RECORDS_STORAGE_KEY, nextRecords);
    await save(ACTIVE_PRACTICE_SESSION_STORAGE_KEY, nextSession);
    await save(LEARNING_PROFILE_STORAGE_KEY, learningProfile);

    if (nextSession.status === 'completed') {
      await save(LAST_PRACTICE_SESSION_STORAGE_KEY, nextSession);
    }

    updateQuestionProgressState(answer, shouldClearWrongCount);
    setPracticeSession(nextSession);
    setAnswers(nextSession.answers);
    setLearningRecords(nextRecords);

    if (practiceSession.mode === 'wrongElimination') {
      const remainingCount = nextRemainingQuestionIds.length;
      const nextEliminationMessage =
        answer.isGradable === false
          ? '本題未提供標準答案，本次作答不列入錯題紀錄。'
          : answer.isCorrect
            ? remainingCount === 0
              ? '太棒了！本次抽選的錯題已全部消除。'
              : (
                  <span className="elimination-feedback">
                    <span className="elimination-feedback__line">答對了！這一題已從錯題本移除。</span>
                    <span className="elimination-feedback__line">目前剩{remainingCount}題待消除。</span>
                  </span>
                )
            : (
                <span className="elimination-feedback">
                  <span className="elimination-feedback__line">這一題仍未答對…</span>
                  <span className="elimination-feedback__line">會保留在待消除的錯題中。</span>
                </span>
              );

      setEliminationMessage(nextEliminationMessage);
    }
  }

  async function persistEssayCompletion(questionId: string) {
    if (!practiceSession) {
      return;
    }

    const nextSession = updatePracticeSessionEssayCompletion(practiceSession, questionId);

    if (nextSession === practiceSession) {
      return;
    }

    setPracticeSession(nextSession);
    await save(ACTIVE_PRACTICE_SESSION_STORAGE_KEY, nextSession);
  }

  function handleSelectAnswer(choice: ChoiceKey) {
    if (!currentQuestion || currentAnswer || isAnswerSaving || isEssayQuestion) {
      return;
    }

    const answer = checkAnswer(currentQuestion, choice);
    setIsAnswerSaving(true);
    void persistAnswer(answer)
      .catch(() => {
        setErrorMessage('儲存作答紀錄時發生錯誤。');
      })
      .finally(() => {
        setIsAnswerSaving(false);
      });
  }

  function handleSubmitEssayAnswer() {
    if (!currentQuestion || !isEssayQuestion || currentEssayAnswer.trim().length === 0 || isGeneratingFeedback) {
      return;
    }

    setIsGeneratingFeedback(true);
    setErrorMessage('');

    try {
      const result = analyzeSmartFeedback({
        answer: currentEssayAnswer,
        coreConcept: currentQuestion.coreConcept ?? currentQuestion.knowledgeNode,
        shortcutKeywords: currentQuestion.shortcutKeywords,
        coreConceptSynonyms: currentQuestion.coreConceptSynonyms,
        bonusConcepts: currentQuestion.bonusConcepts,
      });
      updateEssayQuestionProgressState(currentQuestion.id, currentEssayAnswer);
      setEssayFeedback((previousFeedback) => ({
        ...previousFeedback,
        [currentQuestion.id]: result,
      }));
      void persistEssayCompletion(currentQuestion.id);
    } catch {
      setErrorMessage('產生作答回饋時發生錯誤。');
    } finally {
      setIsGeneratingFeedback(false);
    }
  }

  function handleNext() {
    if (!practiceSession) {
      return;
    }

    const isLastQuestion = currentIndex === questions.length - 1;

    if (isLastQuestion) {
      const resultState = buildPracticeResultState({
        questions,
        answers,
        essayFeedback,
        questionType: typeFilter,
      });
      const completedSession: PracticeSession = {
        ...practiceSession,
        status: 'completed',
        endTime: new Date().toISOString(),
        averageFeedbackLevel: resultState.averageFeedbackLevel ?? practiceSession.averageFeedbackLevel,
      };

      setPracticeSession(completedSession);
      void save(LAST_PRACTICE_SESSION_STORAGE_KEY, completedSession);
      void remove(ACTIVE_PRACTICE_SESSION_STORAGE_KEY);
      navigate('/result', { state: resultState });
      return;
    }

    const nextIndex = currentIndex + 1;
    const nextSession = updatePracticeSessionCurrentIndex(practiceSession, nextIndex);
    setCurrentIndex(nextIndex);
    setPracticeSession(nextSession);
    void save(ACTIVE_PRACTICE_SESSION_STORAGE_KEY, nextSession);
  }

  function handleRequestExplanation() {
    if (!currentQuestion || !currentAnswer || currentExplanation || isExplanationLoading || isEssayQuestion) {
      return;
    }

    setIsExplanationLoading(true);

    Promise.resolve(buildOfflineChoiceExplanation(currentQuestion, currentAnswer.selectedAnswer))
      .then((explanation) => {
        setExplanations((previousExplanations) => ({
          ...previousExplanations,
          [explanation.questionId]: explanation,
        }));
      })
      .catch(() => {
        setErrorMessage('讀取細說分明時發生錯誤。');
      })
      .finally(() => {
        setIsExplanationLoading(false);
      });
  }

  async function handlePracticeTypeChange(nextTypeFilter: PracticeQuestionTypeFilter) {
    if (nextTypeFilter === typeFilter) {
      return;
    }

    await resetCurrentPracticeState();
    setQuestionCount(getDefaultQuestionCountForType(nextTypeFilter));
    setQuestionCountMode('preset');
    if (normalizeWrongQuestionFilterForType(filters.wrongQuestion, nextTypeFilter) !== filters.wrongQuestion) {
      setFilters((current) => ({ ...current, wrongQuestion: 'all' }));
    }
    setTypeFilter(nextTypeFilter);
  }

  async function handleQuestionCountChange(nextQuestionCount: PracticeQuestionCount) {
    if (nextQuestionCount === questionCount) {
      return;
    }

    await resetCurrentPracticeState();
    setQuestionCount(nextQuestionCount);
  }

  async function handleFiltersChange(nextFilters: PracticeFilters) {
    await resetCurrentPracticeState();
    setFilters(normalizePracticeFiltersForOptions(nextFilters, allQuestions));
  }

  async function handleApplySearch() {
    const normalizedSearchQuery = normalizePracticeSearchQuery(searchInput);
    await resetCurrentPracticeState();
    setSearchInput(normalizedSearchQuery);
    setFilters((currentFilters) =>
      normalizePracticeFiltersForOptions({ ...currentFilters, searchQuery: normalizedSearchQuery }, allQuestions),
    );
  }

  async function handleClearSearch() {
    await resetCurrentPracticeState();
    setSearchInput('');
    setQuestionCount(getDefaultQuestionCountForType(typeFilter));
    setQuestionCountMode('preset');
    setFilters((currentFilters) =>
      normalizePracticeFiltersForOptions({ ...currentFilters, searchQuery: '' }, allQuestions),
    );
  }

  async function resetCurrentPracticeState() {
    setAnswers([]);
    setPracticeSession(null);
    setExplanations({});
    setEssayAnswers({});
    setEssayFeedback({});
    setCurrentIndex(0);
    setErrorMessage('');
    setEliminationMessage(null);
    await remove(ACTIVE_PRACTICE_SESSION_STORAGE_KEY);
  }

  function updateQuestionProgressState(answer: PracticeAnswer, clearWrongCount = false) {
    const now = new Date();
    updateQuestionState(answer.questionId, (question) => ({
      ...question,
      myAnswer: answer.selectedAnswer,
      isCorrect: answer.isGradable === false ? '' : answer.isCorrect ? '是' : '否',
      familiarity: String(calculateNextQuestionFamiliarity(question.familiarity, answer.isCorrect)),
      wrongCount: String(clearWrongCount ? 0 : calculateNextQuestionWrongCount(question.wrongCount, answer.isCorrect)),
      drawn: '是',
      lastReview: toDateString(now),
      nextReview: toDateString(addDays(now, 1)),
    }));
  }

  function updateEssayQuestionProgressState(questionId: string, essayAnswer: string) {
    const now = new Date();
    updateQuestionState(questionId, (question) => ({
      ...question,
      myAnswer: essayAnswer,
      drawn: '是',
      lastReview: toDateString(now),
      nextReview: toDateString(addDays(now, 1)),
    }));
  }

  function updateQuestionState(questionId: string, updater: (question: Question) => Question) {
    setQuestions((previousQuestions) =>
      previousQuestions.map((question) => (question.id === questionId ? updater(question) : question)),
    );
    setAllQuestions((previousQuestions) =>
      previousQuestions.map((question) => (question.id === questionId ? updater(question) : question)),
    );
  }

  if (isLoading) {
    return <div className="status-page">Practice 載入中...</div>;
  }

  if (errorMessage && !currentQuestion) {
    return (
      <section className="status-page">
        <h1>Practice</h1>
        <p>{errorMessage}</p>
      </section>
    );
  }

  return (
    <section className="practice-page">
      <header className="page-header">
        <h1>Practice</h1>
      </header>

      <details
        className="practice-settings"
        open={isSettingsOpen}
        onToggle={(event) => setIsSettingsOpen(event.currentTarget.open)}
      >
        <summary>
          <span aria-hidden="true" className="disclosure-icon">
            {isSettingsOpen ? '▼' : '▶'}
          </span>
          <span>練習設定</span>
          <strong>{settingsSummary}</strong>
        </summary>
        <div className="practice-controls">
          <PracticeFilterSelector
            options={filterOptions}
            typeFilter={typeFilter}
            value={filters}
            searchInput={searchInput}
            searchResultCount={eligibleQuestionCount}
            onApplySearch={() => void handleApplySearch()}
            onChange={(value) => void handleFiltersChange(value)}
            onClearSearch={() => void handleClearSearch()}
            onSearchInputChange={setSearchInput}
          />
          <PracticeTypeSelector value={typeFilter} onChange={(value) => void handlePracticeTypeChange(value)} />
          <PracticeCountSelector
            actualPracticeQuestionCount={questions.length}
            maxCount={Math.max(eligibleQuestionCount, 1)}
            mode={questionCountMode}
            value={questionCount}
            onChange={(value) => void handleQuestionCountChange(value)}
            onModeChange={setQuestionCountMode}
          />
        </div>
      </details>

      {questions.length === 0 || !currentQuestion ? (
        <section className="practice-empty-state">
          <h1>目前沒有符合條件的題目。</h1>
          <p>{emptyPracticeMessage}</p>
        </section>
      ) : (
        <>
          {practiceSession?.mode === 'wrongElimination' ? (
            <ProgressBar
              current={(practiceSession.remainingQuestionIds ?? practiceSession.questionIds).length}
              total={practiceSession.initialQuestionIds?.length ?? practiceSession.questionIds.length}
              mode="remaining"
              label={`剩餘 ${(practiceSession.remainingQuestionIds ?? practiceSession.questionIds).length} / ${
                practiceSession.initialQuestionIds?.length ?? practiceSession.questionIds.length
              } 題`}
            />
          ) : (
            <ProgressBar current={currentIndex + 1} total={questions.length} />
          )}
          {isEssayQuestion ? (
            <EssayPracticeCard
              feedback={currentEssayFeedback}
              answer={currentEssayAnswer}
              errorMessage={errorMessage}
              isGeneratingFeedback={isGeneratingFeedback}
              isLastQuestion={currentIndex === questions.length - 1}
              onAnswerChange={(value) =>
                setEssayAnswers((previousAnswers) => ({
                  ...previousAnswers,
                  [currentQuestion.id]: value,
                }))
              }
              onNext={handleNext}
              onSubmit={handleSubmitEssayAnswer}
              question={currentQuestion}
            />
          ) : (
            <QuestionCard
              question={currentQuestion}
              answer={currentAnswer}
              onSelectAnswer={handleSelectAnswer}
              onNext={handleNext}
              isLastQuestion={currentIndex === questions.length - 1}
              isAnswerSaving={isAnswerSaving}
              explanation={currentExplanation}
              isExplanationLoading={isExplanationLoading}
              onRequestExplanation={handleRequestExplanation}
              answerHeadline={practiceSession?.mode === 'wrongElimination' && currentAnswer ? eliminationMessage : undefined}
            />
          )}
        </>
      )}
    </section>
  );
}

export function selectPracticeQuestions({
  filteredQuestions,
  loadedQuestions,
  questionCount,
  requestedLearningTheme,
  requestedQuestionIds,
  requestedSubject,
  restoredSession,
  typeFilter,
}: {
  filteredQuestions: readonly Question[];
  loadedQuestions: readonly Question[];
  questionCount: PracticeQuestionCount;
  requestedLearningTheme?: string;
  requestedQuestionIds?: readonly string[];
  requestedSubject?: string;
  restoredSession: PracticeSession | null;
  typeFilter: PracticeQuestionTypeFilter;
}): Question[] {
  if (requestedQuestionIds?.length) {
    return drawPracticeQuestionsByIds(filteredQuestions, requestedQuestionIds, typeFilter, questionCount);
  }

  if (requestedLearningTheme) {
    return drawPracticeQuestionsByLearningTheme(filteredQuestions, requestedLearningTheme, typeFilter, questionCount, requestedSubject);
  }

  if (restoredSession) {
    return restoreSessionQuestions(restoredSession, loadedQuestions);
  }

  return drawPracticeQuestions(filteredQuestions, typeFilter, questionCount);
}

function getPracticeTypeLabel(value: PracticeQuestionTypeFilter): string {
  return practiceTypeOptions.find((option) => option.value === value)?.label ?? '選擇題';
}

function getRequestedQuestionPool(questions: readonly Question[], requestedQuestionIds?: readonly string[]): Question[] {
  if (!requestedQuestionIds?.length) {
    return [];
  }

  const requestedQuestionIdSet = new Set(requestedQuestionIds);
  return questions.filter((question) => requestedQuestionIdSet.has(question.id));
}

function getEmptyPracticeMessage(
  typeFilter: PracticeQuestionTypeFilter,
  requestedQuestionPool: readonly Question[],
  searchQuery = '',
): string {
  const normalizedSearchQuery = normalizePracticeSearchQuery(searchQuery);

  if (normalizedSearchQuery) {
    const keywords = normalizedSearchQuery.split(' ').filter(Boolean);

    if (keywords.length > 1) {
      return `找不到同時含有${keywords.map((keyword) => `「${keyword}」`).join('與')}且符合目前篩選條件的題目，請調整搜尋內容或篩選條件。`;
    }

    return `找不到含有「${normalizedSearchQuery}」且符合目前篩選條件的題目，請調整搜尋內容或篩選條件。`;
  }

  if (requestedQuestionPool.length === 0) {
    return '請調整篩選條件。';
  }

  const choiceCount = requestedQuestionPool.filter((question) => question.type === CHOICE_QUESTION_TYPE).length;
  const essayCount = requestedQuestionPool.filter((question) => question.type === ESSAY_QUESTION_TYPE).length;

  if (typeFilter === 'choice' && choiceCount === 0 && essayCount > 0) {
    return `此學習主題目前沒有選擇題，共有 ${essayCount} 題非選題。請在練習設定中切換為非選題。`;
  }

  if (typeFilter === 'essay' && essayCount === 0 && choiceCount > 0) {
    return `此學習主題目前沒有非選題，共有 ${choiceCount} 題選擇題。請在練習設定中切換為選擇題。`;
  }

  return '請調整篩選條件。';
}

export function PracticeFilterSelector({
  options,
  typeFilter,
  value,
  searchInput = '',
  searchResultCount = 0,
  onApplySearch = () => undefined,
  onChange,
  onClearSearch = () => undefined,
  onSearchInputChange = () => undefined,
}: {
  options: { years: string[]; subjects: string[]; coreConcepts: string[] };
  typeFilter: PracticeQuestionTypeFilter;
  value: PracticeFilters;
  searchInput?: string;
  searchResultCount?: number;
  onApplySearch?: () => void;
  onChange: (value: PracticeFilters) => void;
  onClearSearch?: () => void;
  onSearchInputChange?: (value: string) => void;
}) {
  return (
    <fieldset className="practice-type-selector">
      <legend>題目篩選</legend>
      <label>
        年度
        <select value={value.year} onChange={(event) => onChange({ ...value, year: event.target.value })}>
          <option value="">全部年度</option>
          {options.years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>
      <label>
        科目
        <select value={value.subject} onChange={(event) => onChange({ ...value, subject: event.target.value })}>
          <option value="">全部科目</option>
          {options.subjects.map((subject) => (
            <option key={subject} value={subject}>
              {subject}
            </option>
          ))}
        </select>
      </label>
      <label>
        核心概念
        <select value={value.coreConcept} onChange={(event) => onChange({ ...value, coreConcept: event.target.value })}>
          <option value="">全部核心概念</option>
          {options.coreConcepts.map((coreConcept) => (
            <option key={coreConcept} value={coreConcept}>
              {coreConcept}
            </option>
          ))}
        </select>
      </label>
      <label>
        錯題練習
        <select
          value={value.wrongQuestion}
          onChange={(event) =>
            onChange({
              ...value,
              wrongQuestion:
                typeFilter !== 'choice'
                  ? 'all'
                  : event.target.value === 'wrongOnly' || event.target.value === 'wrongElimination'
                  ? event.target.value
                  : 'all',
            })
          }
        >
          <option value="all">全部題目</option>
          <option value="wrongOnly" disabled={typeFilter !== 'choice'}>
            僅錯題
          </option>
          <option value="wrongElimination" disabled={typeFilter !== 'choice'}>
            錯題消除模式
          </option>
        </select>
      </label>
      <div className="practice-search-field">
        <span className="practice-search-field__label">{'\u641c\u5c0b\u984c\u76ee'}</span>
        <div className="practice-search-field__control" role="search">
          <span className="practice-search-field__icon" aria-hidden="true">
            {'\uD83D\uDD0D'}
          </span>
          <div className="practice-search-field__input-wrap">
            <input
              aria-label={'\u641c\u5c0b\u984c\u76ee'}
              enterKeyHint="search"
              placeholder={'\u8f38\u5165\u95dc\u9375\u5b57\uff0c\u53ef\u7528\u7a7a\u767d\u5206\u9694'}
              type="search"
              value={searchInput}
              onChange={(event) => onSearchInputChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  onApplySearch();
                }
              }}
            />
            {searchInput || value.searchQuery ? (
              <button className="practice-search-field__clear" type="button" aria-label={'\u6e05\u9664\u641c\u5c0b'} onClick={onClearSearch}>
                {'\u00d7'}
              </button>
            ) : null}
          </div>
          <button className="secondary-button practice-search-field__submit" type="button" onClick={onApplySearch}>
            {'\u641c\u5c0b'}
          </button>
        </div>
        {value.searchQuery ? (
          <p className="practice-search-field__result">
            {'\u641c\u5c0b\u300c'}{value.searchQuery}{'\u300d\u30fb\u7b26\u5408 '}{searchResultCount}{' \u984c'}
          </p>
        ) : null}
      </div>
    </fieldset>
  );
}

export function normalizePracticeFiltersForOptions(filters: PracticeFilters, questions: readonly Question[]): PracticeFilters {
  const options = buildPracticeFilterOptionsForFilters(questions, filters);
  const nextFilters = { ...filters };

  if (nextFilters.subject) {
    const normalizedSelectedSubject = normalizeSubjectName(nextFilters.subject);
    const matchingSubject = options.subjects.find((subject) => normalizeSubjectName(subject) === normalizedSelectedSubject);
    nextFilters.subject = matchingSubject ?? '';
  }

  const coreConceptOptions = buildPracticeFilterOptionsForFilters(questions, nextFilters);

  if (nextFilters.coreConcept && !coreConceptOptions.coreConcepts.includes(nextFilters.coreConcept)) {
    nextFilters.coreConcept = '';
  }

  return nextFilters;
}

export function PracticeTypeSelector({
  value,
  onChange,
}: {
  value: PracticeQuestionTypeFilter;
  onChange: (value: PracticeQuestionTypeFilter) => void;
}) {
  return (
    <fieldset className="practice-type-selector">
      <legend>題型</legend>
      {practiceTypeOptions.map((option) => (
        <label key={option.value}>
          <input
            checked={value === option.value}
            name="practice-question-type"
            type="radio"
            value={option.value}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}

export function PracticeCountSelector({
  actualPracticeQuestionCount,
  maxCount,
  mode,
  value,
  onChange,
  onModeChange,
}: {
  actualPracticeQuestionCount?: number;
  maxCount: number;
  mode: PracticeCountMode;
  value: PracticeQuestionCount;
  onChange: (value: PracticeQuestionCount) => void;
  onModeChange: (value: PracticeCountMode) => void;
}) {
  const [draftValue, setDraftValue] = useState(String(value));
  const displayedSelection = getDisplayedQuestionCountSelection({
    actualPracticeQuestionCount: actualPracticeQuestionCount ?? value,
    configuredQuestionCount: value,
    questionCountMode: mode,
  });

  useEffect(() => {
    setDraftValue(String(value));
  }, [value, mode]);

  function commitCustomQuestionCount() {
    const nextValue = normalizeCustomQuestionCount({
      requestedCount: Number(draftValue),
      eligibleQuestionCount: maxCount,
    });
    setDraftValue(String(nextValue));
    onChange(nextValue);
  }

  return (
    <fieldset className="practice-type-selector">
      <legend>題數</legend>
      {practiceCountOptions.map((option) => (
        <label key={option}>
          <input
            checked={displayedSelection === option}
            name="practice-question-count"
            type="radio"
            value={option}
            onChange={() => {
              onModeChange('preset');
              onChange(option);
            }}
          />
          {option} 題
        </label>
      ))}
      <label>
        <input
          checked={displayedSelection === 'custom'}
          name="practice-question-count"
          type="radio"
          value="custom"
          onChange={() => onModeChange('custom')}
        />
        自訂
      </label>
      {mode === 'custom' ? (
        <input
          aria-label="自訂題數"
          className="practice-count-input"
          min={1}
          type="number"
          value={draftValue}
          onBlur={commitCustomQuestionCount}
          onChange={(event) => setDraftValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur();
            }
          }}
        />
      ) : null}
    </fieldset>
  );
}

export function sanitizeCustomQuestionCount(value: number, maxCount: number): number {
  const normalizedMaxCount = Math.max(1, Math.floor(maxCount));
  const normalizedValue = Number.isFinite(value) ? Math.floor(value) : 1;
  return Math.max(1, Math.min(normalizedValue, normalizedMaxCount));
}

export function sanitizeConfiguredQuestionCount(value: number): number {
  const normalizedValue = Number.isFinite(value) ? Math.floor(value) : 1;
  return Math.max(1, normalizedValue);
}

export function normalizeCustomQuestionCount({
  requestedCount,
  eligibleQuestionCount,
}: {
  requestedCount: number;
  eligibleQuestionCount: number;
}): PracticeQuestionCount {
  return sanitizeCustomQuestionCount(requestedCount, Math.max(eligibleQuestionCount, 1));
}

export function getEffectivePracticeQuestionCount(questionCount: PracticeQuestionCount, eligibleQuestionCount: number): number {
  return sanitizeCustomQuestionCount(questionCount, Math.max(eligibleQuestionCount, 1));
}

export function getDisplayedPracticeQuestionCount({
  configuredQuestionCount,
  eligibleQuestionCount,
}: {
  configuredQuestionCount: PracticeQuestionCount;
  eligibleQuestionCount: number;
}): number {
  const normalizedEligibleQuestionCount = Number.isFinite(eligibleQuestionCount)
    ? Math.max(0, Math.floor(eligibleQuestionCount))
    : 0;

  if (normalizedEligibleQuestionCount === 0) {
    return 0;
  }

  return getEffectivePracticeQuestionCount(configuredQuestionCount, normalizedEligibleQuestionCount);
}

export function buildPracticeSettingsSummary({
  typeFilter,
  questionCount,
  filters,
}: {
  typeFilter: PracticeQuestionTypeFilter;
  questionCount: number;
  filters: PracticeFilters;
}): string {
  return [getPracticeTypeLabel(typeFilter), `${questionCount} \u984C`, ...summarizePracticeFilters(filters)].join('\u30FB');
}

type DisplayedQuestionCountSelection = PracticeQuestionCount | 'custom' | null;

export function getDisplayedQuestionCountSelection({
  actualPracticeQuestionCount,
  configuredQuestionCount,
  questionCountMode,
}: {
  actualPracticeQuestionCount: number;
  configuredQuestionCount: PracticeQuestionCount;
  questionCountMode: PracticeCountMode;
}): DisplayedQuestionCountSelection {
  const normalizedActualCount = sanitizeConfiguredQuestionCount(actualPracticeQuestionCount);

  if (questionCountMode === 'custom') {
    return configuredQuestionCount === normalizedActualCount ? 'custom' : null;
  }

  return practiceCountOptions.includes(normalizedActualCount) ? normalizedActualCount : null;
}

export function canUseRestoredPracticeSession(
  savedSession: PracticeSession | null,
  loadedQuestions: readonly Question[],
  typeFilter: PracticeQuestionTypeFilter,
  shouldStartFocusedPractice: boolean,
  filteredQuestions: readonly Question[] = loadedQuestions,
  questionCount?: PracticeQuestionCount,
): boolean {
  if (shouldStartFocusedPractice || typeFilter !== 'choice' || !canRestorePracticeSession(savedSession, loadedQuestions)) {
    return false;
  }

  if (questionCount && savedSession && savedSession.questionIds.length !== Math.min(questionCount, filteredQuestions.length)) {
    return false;
  }

  const filteredQuestionIds = new Set(filteredQuestions.map((question) => question.id));
  return savedSession.questionIds.every((questionId) => filteredQuestionIds.has(questionId));
}

function calculateNextQuestionFamiliarity(value: string | undefined, isCorrect: boolean): number {
  const currentValue = Number(value ?? 3);
  const normalizedValue = Number.isFinite(currentValue) ? currentValue : 3;
  return Math.max(0, Math.min(4, normalizedValue + (isCorrect ? 1 : -1)));
}

function calculateNextQuestionWrongCount(value: string | undefined, isCorrect: boolean): number {
  const currentValue = Number(value ?? 0);
  const normalizedValue = Number.isFinite(currentValue) ? currentValue : 0;
  return normalizedValue + (isCorrect ? 0 : 1);
}

function addDays(date: Date, days: number): Date {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function EssayPracticeCard({
  feedback,
  answer,
  errorMessage,
  isGeneratingFeedback,
  isLastQuestion,
  onAnswerChange,
  onNext,
  onSubmit,
  question,
}: {
  feedback?: SmartFeedbackResult;
  answer: string;
  errorMessage: string;
  isGeneratingFeedback: boolean;
  isLastQuestion: boolean;
  onAnswerChange: (value: string) => void;
  onNext: () => void;
  onSubmit: () => void;
  question: Question;
}) {
  return (
    <section className="question-card essay-practice-card">
      <div className="question-meta">
        <span>{question.year}</span>
        <span>{question.subject}</span>
        <span>{getLearningThemeDisplayName(question.learningTheme)}</span>
        <span>{question.coreConcept ?? question.knowledgeNode}</span>
        <span>第 {question.questionNumber} 題</span>
      </div>

      <h1 className="question-stem">{question.stem}</h1>
      <p className="essay-score">配分：{question.score || 0}</p>

      <label className="form-field">
        <span>我的答案</span>
        <textarea
          value={answer}
          rows={8}
          placeholder="請輸入你的作答內容..."
          onChange={(event) => onAnswerChange(event.target.value)}
        />
      </label>

      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

      <button className="primary-button" type="button" disabled={isGeneratingFeedback || answer.trim().length === 0} onClick={onSubmit}>
        {isGeneratingFeedback ? '產生中...' : '送出答案'}
      </button>

      {feedback ? (
        <SmartFeedbackPanel result={feedback} />
      ) : null}
      <ReferenceAnswerPanel key={question.id} questionId={question.id} referenceAnswer={question.essayReferenceAnswer} />
      {feedback ? (
        <button className="primary-button" type="button" onClick={onNext}>
          {isLastQuestion ? '查看結果' : '下一題'}
        </button>
      ) : null}
    </section>
  );
}
