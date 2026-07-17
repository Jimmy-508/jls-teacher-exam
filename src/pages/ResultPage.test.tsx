import { renderToStaticMarkup } from 'react-dom/server';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CHOICE_QUESTION_TYPE, ESSAY_QUESTION_TYPE } from '../services/questionBankFields';
import { LAST_PRACTICE_SESSION_STORAGE_KEY } from '../services/learningEngine';
import { load } from '../services/storageService';
import ResultPage from './ResultPage';

const locationState = vi.hoisted(() => ({ value: undefined as unknown }));
const loadMock = vi.hoisted(() => vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => null));

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ state: locationState.value }),
  Link: ({ children, to, className }: { children: ReactNode; to: string; className?: string }) => (
    <a className={className} href={to}>
      {children}
    </a>
  ),
}));

vi.mock('../services/storageService', () => ({
  load: loadMock,
}));

describe('ResultPage', () => {
  beforeEach(() => {
    locationState.value = undefined;
    loadMock.mockReset();
    loadMock.mockResolvedValue(null);
  });

  it('shows accuracy for choice practice results', () => {
    locationState.value = {
      totalCount: 5,
      correctCount: 4,
      wrongCount: 1,
      gradableCount: 5,
      questionType: CHOICE_QUESTION_TYPE,
    };

    const html = renderToStaticMarkup(<ResultPage />);

    expect(getStatCardText(html, '答對題數')).toContain('4');
    expect(getStatCardText(html, '答錯題數')).toContain('1');
    expect(html).toContain('正確率');
    expect(html).toContain('80%');
    expect(html).not.toContain('不列入計算');
    expect(html).not.toContain('核心概念');
  });

  it('shows essay practice correct and wrong counts as not counted', () => {
    locationState.value = {
      totalCount: 2,
      correctCount: 0,
      wrongCount: 0,
      gradableCount: 0,
      questionType: ESSAY_QUESTION_TYPE,
      averageFeedbackLevel: 3,
    };

    const html = renderToStaticMarkup(<ResultPage />);

    expect(getStatCardText(html, '答對題數')).toContain('不列入計算');
    expect(getStatCardText(html, '答對題數')).not.toMatch(/<strong>0<\/strong>/);
    expect(getStatCardText(html, '答錯題數')).toContain('不列入計算');
    expect(getStatCardText(html, '答錯題數')).not.toMatch(/<strong>0<\/strong>/);
    expect(html.match(/不列入計算/g)).toHaveLength(2);
    expect(html).toContain('核心概念');
    expect(html).toContain('★★★☆☆');
    expect(html).not.toContain('正確率');
    expect(html).not.toContain('0%');
  });

  it.each([
    [1, '★☆☆☆☆'],
    [3, '★★★☆☆'],
    [5, '★★★★★'],
  ] as const)('keeps essay average stars for level %s', (averageFeedbackLevel, stars) => {
    locationState.value = {
      totalCount: 2,
      correctCount: 0,
      wrongCount: 0,
      gradableCount: 0,
      questionType: ESSAY_QUESTION_TYPE,
      averageFeedbackLevel,
    };

    const html = renderToStaticMarkup(<ResultPage />);

    expect(html).toContain('核心概念');
    expect(html).toContain(stars);
    expect(html).not.toContain('正確率');
    expect(html).not.toContain('無可評分題目');
  });

  it('shows a clear message when essay feedback has not been evaluated', () => {
    locationState.value = {
      totalCount: 1,
      correctCount: 0,
      wrongCount: 0,
      gradableCount: 0,
      questionType: ESSAY_QUESTION_TYPE,
    };

    const html = renderToStaticMarkup(<ResultPage />);

    expect(html).toContain('核心概念');
    expect(html).toContain('尚未評估');
  });

  it('restores essay display from the last practice session', async () => {
    loadMock.mockResolvedValue({
      id: 'session-1',
      startTime: '2026-07-17T00:00:00.000Z',
      totalQuestions: 2,
      correctCount: 0,
      wrongCount: 0,
      accuracy: 0,
      durationSeconds: 60,
      questionType: ESSAY_QUESTION_TYPE,
      averageFeedbackLevel: 5,
      questionIds: ['E1', 'E2'],
      currentIndex: 1,
      answers: [],
      status: 'completed',
    });
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<ResultPage />);
    });

    expect(load).toHaveBeenCalledWith(LAST_PRACTICE_SESSION_STORAGE_KEY);
    expect(getStatCardText(container.innerHTML, '答對題數')).toContain('不列入計算');
    expect(getStatCardText(container.innerHTML, '答錯題數')).toContain('不列入計算');
    expect(container.innerHTML).toContain('核心概念');
    expect(container.innerHTML).toContain('★★★★★');

    root.unmount();
  });
});

function getStatCardText(html: string, label: string): string {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`<div><span>${escapedLabel}</span><strong>.*?</strong></div>`));

  return match?.[0] ?? '';
}
