import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LearningJourneyCard from '../components/LearningJourneyCard';
import TodayFocusCard from '../components/TodayFocusCard';
import TodayRecommendationCard from '../components/TodayRecommendationCard';
import { loadQuestions } from '../services/csvService';
import { generateThemeInsights, generateThemeRecommendations } from '../services/insightEngine';
import {
  ACTIVE_PRACTICE_SESSION_STORAGE_KEY,
  LAST_PRACTICE_SESSION_STORAGE_KEY,
  LEARNING_RECORDS_STORAGE_KEY,
} from '../services/learningEngine';
import { buildLearningThemes } from '../services/learningThemeService';
import { buildKnowledgeNodes } from '../services/knowledgeService';
import { load } from '../services/storageService';
import { buildTodayViewModel } from '../services/todayEngine';
import { selectAndSaveTodayPracticeQuestions } from '../services/todayPracticeHistoryService';
import { getDisplayName } from '../services/userSettingsService';
import type { LearningRecord } from '../types/LearningRecord';
import type { PracticeSession } from '../types/PracticeSession';
import type { TodayRecommendation, TodayViewModel } from '../types/Today';

export default function TodayPage() {
  const navigate = useNavigate();
  const [viewModel, setViewModel] = useState<TodayViewModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadToday() {
      try {
        const questions = await loadQuestions();
        const recordsByQuestionId = (await load<Record<string, LearningRecord>>(LEARNING_RECORDS_STORAGE_KEY)) ?? {};
        const activeSession = await load<PracticeSession>(ACTIVE_PRACTICE_SESSION_STORAGE_KEY);
        const lastSession = await load<PracticeSession>(LAST_PRACTICE_SESSION_STORAGE_KEY);
        const displayName = await getDisplayName();
        const practiceSessions = [activeSession, lastSession].filter((session): session is PracticeSession =>
          Boolean(session),
        );
        const learningRecords = Object.values(recordsByQuestionId);
        const knowledgeNodes = buildKnowledgeNodes(questions, learningRecords);
        const learningThemes = buildLearningThemes(questions, learningRecords);
        const insights = generateThemeInsights(learningThemes);
        const recommendations = generateThemeRecommendations(insights, learningThemes);
        const todayViewModel = buildTodayViewModel({
          questions,
          learningRecords,
          practiceSessions,
          knowledgeNodes,
          learningThemes,
          learningInsights: insights,
          recommendations,
          displayName,
        });

        if (!isMounted) {
          return;
        }

        setViewModel(todayViewModel);
      } catch (error: unknown) {
        if (error instanceof Error) {
          setErrorMessage(error.message);
          return;
        }

        setErrorMessage('載入 Today 時發生錯誤。');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadToday();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleStartTodayPractice() {
    if (!viewModel?.focus) {
      return;
    }

    const questionIds = await selectAndSaveTodayPracticeQuestions({
      learningTheme: viewModel.focus.learningThemeName,
      questionIds: viewModel.focus.questionIds,
      count: viewModel.focus.questionCount,
    });

    navigate('/practice', {
      state: {
        questionIds,
        learningTheme: viewModel.focus.learningThemeName,
        fromToday: true,
      },
    });
  }

  function handleStartRecommendationPractice(recommendation: TodayRecommendation) {
    navigate('/practice', {
      state: {
        questionIds: recommendation.targetQuestionIds,
        learningTheme: recommendation.targetKnowledgeNode,
        fromTodayRecommendation: true,
      },
    });
  }

  if (isLoading) {
    return <div className="status-page">Today 載入中...</div>;
  }

  if (errorMessage || !viewModel) {
    return (
      <section className="status-page">
        <h1>無法載入 Today</h1>
        <p>{errorMessage || '目前沒有 Today 資料。'}</p>
      </section>
    );
  }

  return (
    <section className="today-page">
      <header className="today-header">
        <span>Today</span>
        <h1>{viewModel.greeting}</h1>
      </header>

      {viewModel.focus ? <TodayFocusCard focus={viewModel.focus} onStart={() => void handleStartTodayPractice()} /> : null}
      <LearningJourneyCard journey={viewModel.journey} />
      <TodayRecommendationCard recommendation={viewModel.recommendation} onPractice={handleStartRecommendationPractice} />
    </section>
  );
}
