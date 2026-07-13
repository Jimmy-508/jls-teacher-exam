import { describe, expect, it } from 'vitest';
import {
  buildLearningThemes,
  detectWeakLearningThemes,
  findThemeByKnowledgeNode,
  getQuestionsByTheme,
  isQuestionInLearningTheme,
  resolveQuestionLearningTheme,
} from './learningThemeService';
import { parseCsv, toQuestion } from './csvService';
import { CHOICE_QUESTION_TYPE, ESSAY_QUESTION_TYPE } from './questionBankFields';
import type { LearningRecord } from '../types/LearningRecord';
import type { Question } from '../types/question';

const questions: Question[] = [
  createQuestion('q1', '教學評量', '形成性評量'),
  createQuestion('q2', '教學評量', '信度'),
  createQuestion('q3', '班級經營', '正向管教'),
];

describe('learningThemeService', () => {
  it('builds LearningTheme from Question.learningTheme', () => {
    const themes = buildLearningThemes(questions);
    const theme = themes.find((item) => item.name === '教學評量');

    expect(theme?.questionIds).toEqual(['q1', 'q2']);
    expect(theme?.questionCount).toBe(2);
    expect(theme?.choiceQuestionCount).toBe(2);
    expect(theme?.essayQuestionCount).toBe(0);
  });

  it('allows one LearningTheme to contain multiple KnowledgeNodes', () => {
    const theme = buildLearningThemes(questions).find((item) => item.name === '教學評量');

    expect(theme?.knowledgeNodeIds).toHaveLength(2);
  });

  it('keeps KnowledgeNode fine-grained while finding theme by node', () => {
    const themes = buildLearningThemes(questions);
    const nodeId = themes.find((theme) => theme.name === '班級經營')?.knowledgeNodeIds[0] ?? '';

    expect(findThemeByKnowledgeNode(themes, nodeId)?.name).toBe('班級經營');
    expect(findThemeByKnowledgeNode(themes, '形成性評量')?.name).toBe('教學評量');
  });

  it('filters questions by theme', () => {
    expect(getQuestionsByTheme(questions, '教學評量').map((question) => question.id)).toEqual(['q1', 'q2']);
  });

  it('counts choice and essay questions separately for mixed LearningThemes', () => {
    const themes = buildLearningThemes([
      createQuestion('q9', '性別教育', '性別平等', '教育理念與實務', CHOICE_QUESTION_TYPE),
      createQuestion('q10', '性別教育', '性別教育實施', '教育理念與實務', ESSAY_QUESTION_TYPE),
    ]);

    expect(themes[0]).toMatchObject({
      name: '性別教育',
      subject: '教育理念與實務',
      questionCount: 2,
      choiceQuestionCount: 1,
      essayQuestionCount: 1,
      questionIds: ['q9', 'q10'],
    });
  });

  it('resolves fallback theme names consistently from group and core concept', () => {
    const question = {
      ...createQuestion('q11', '', '核心概念', '教育理念與實務', CHOICE_QUESTION_TYPE),
      group: ' 性別教育 ',
      learningTheme: '',
    };

    expect(resolveQuestionLearningTheme(question)).toEqual({
      subject: '教育理念與實務',
      name: '性別教育',
    });
    expect(isQuestionInLearningTheme(question, '教育理念與實務', '性別教育')).toBe(true);
  });

  it('requires subject and theme to match together', () => {
    const sameThemeDifferentSubject = createQuestion('q12', '性別教育', '性別平等', '課程教學與評量');

    expect(isQuestionInLearningTheme(sameThemeDifferentSubject, '教育理念與實務', '性別教育')).toBe(false);
    expect(isQuestionInLearningTheme(sameThemeDifferentSubject, '課程教學與評量', '性別教育')).toBe(true);
  });

  it('detects weak LearningThemes', () => {
    const records: LearningRecord[] = [
      createRecord('q1', 0, 2, 1),
      createRecord('q2', 1, 0, 3),
    ];
    const weakThemes = detectWeakLearningThemes(buildLearningThemes(questions, records));

    expect(weakThemes.map((theme) => theme.name)).toContain('教學評量');
  });

  it('maps CSV 類別 to learningTheme and group', () => {
    const csv = [
      'ID,年度,類科,科目,題號,題型,分數,類別,知識節點,題幹,A,B,C,D,標準答案,我的答案,是否答對,熟悉度,錯誤次數,已抽過,最後複習,下次複習,來源頁,備註,捷徑關鍵字',
      'Q001,113,國小,教育,1,選擇題,2,教學評量,形成性評量,題幹,A,B,C,D,A,,,,,,,,,,備註,評量',
    ].join('\n');
    const question = toQuestion(parseCsv(csv)[0]);

    expect(question.group).toBe('教學評量');
    expect(question.learningTheme).toBe('教學評量');
    expect(question.knowledgeNode).toBe('形成性評量');
  });

  it('uses display dictionary for LearningTheme card titles', () => {
    const themes = buildLearningThemes([createQuestion('q4', '教原', '教育目的')]);

    expect(themes[0].name).toBe('教育原理與制度');
  });

  it('displays 測驗 and 課程 aliases as official theme names', () => {
    const themes = buildLearningThemes([
      createQuestion('q5', '測驗', '信度'),
      createQuestion('q6', '課程', '校本課程'),
    ]);

    expect(themes.map((theme) => theme.name)).toContain('教育測驗與評量');
    expect(themes.map((theme) => theme.name)).toContain('課程發展與設計');
  });

  it('does not merge same-named LearningThemes across different subjects', () => {
    const themes = buildLearningThemes([
      createQuestion('q7', '範例', '核心概念', '教育理念與實務'),
      createQuestion('q8', '範例', '核心概念', '學習者發展與適性輔導'),
    ]);

    expect(themes).toHaveLength(2);
    expect(themes.map((theme) => theme.subject)).toContain('教育理念與實務');
    expect(themes.map((theme) => theme.subject)).toContain('學習者發展與適性輔導');
  });
});

function createQuestion(
  id: string,
  learningTheme: string,
  knowledgeNode: string,
  subject = '教育',
  type: Question['type'] = CHOICE_QUESTION_TYPE,
): Question {
  return {
    id,
    year: '113',
    category: '國小',
    subject,
    questionNumber: id,
    type,
    score: 2,
    group: learningTheme,
    learningTheme,
    knowledgeNode,
    stem: '題幹',
    optionA: 'A',
    optionB: 'B',
    optionC: 'C',
    optionD: 'D',
    correctAnswer: 'A',
  };
}

function createRecord(questionId: string, correctCount: number, wrongCount: number, familiarity: number): LearningRecord {
  return {
    id: questionId,
    learningTheme: '',
    knowledgeNode: '',
    mastery: familiarity * 25,
    masteredCount: 0,
    missingCount: 0,
    recentMissing: [],
    updatedAt: '2026-07-06T00:00:00.000Z',
    questionId,
    lastAnswer: 'A',
    lastCorrect: wrongCount === 0,
    correctCount,
    wrongCount,
    familiarity,
    reviewCount: correctCount + wrongCount,
    viewedAI: false,
  };
}
