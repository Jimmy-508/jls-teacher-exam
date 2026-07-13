import type { AIProvider } from '../AIProvider';
import { getOpenAIApiKey, openAIConfig, type OpenAIConfig } from '../../config/openai';
import type { AnswerAnalysisResult } from '../../types/AnswerAnalysisResult';
import type { KnowledgeGapInput } from '../../types/KnowledgeGapInput';
import { MockAIProvider } from './MockAIProvider';

interface OpenAIResponsesUsage {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
}

interface OpenAIResponsesBody {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      type?: string;
    }>;
  }>;
  usage?: OpenAIResponsesUsage;
}

interface OpenAIProviderOptions extends Partial<OpenAIConfig> {
  fetchFn?: typeof fetch;
  fallbackProvider?: AIProvider;
}

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const OPENAI_FALLBACK_NOTICE = 'OpenAI 分析失敗，已改用 Mock 分析。';
const SYSTEM_PROMPT = [
  'You are an experienced teacher certification examiner.',
  "Analyze the student's essay.",
  'Focus only on:',
  '1. mastered knowledge',
  '2. missing knowledge',
  '3. knowledge coverage',
  '4. concise summary',
  'Never praise.',
  'Never criticize.',
  'Never generate long articles.',
  'Always return JSON only.',
].join('\n');

export class OpenAIProvider implements AIProvider {
  private readonly config: OpenAIConfig;
  private readonly fetchFn: typeof fetch;
  private readonly fallbackProvider: AIProvider;

  constructor(options: OpenAIProviderOptions = {}) {
    this.config = {
      apiKey: options.apiKey ?? getOpenAIApiKey(),
      model: options.model ?? openAIConfig.model,
      temperature: options.temperature ?? openAIConfig.temperature,
      maxTokens: options.maxTokens ?? openAIConfig.maxTokens,
    };
    this.fetchFn = options.fetchFn ?? fetch;
    this.fallbackProvider = options.fallbackProvider ?? new MockAIProvider();
  }

  async analyzeEssay(input: KnowledgeGapInput): Promise<AnswerAnalysisResult> {
    if (!this.config.apiKey) {
      return this.fallbackProvider.analyzeEssay(input);
    }

    const startedAt = performance.now();

    try {
      const response = await this.fetchFn(OPENAI_RESPONSES_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          temperature: this.config.temperature,
          max_output_tokens: this.config.maxTokens,
          input: [
            {
              role: 'system',
              content: SYSTEM_PROMPT,
            },
            {
              role: 'user',
              content: buildUserPrompt(input),
            },
          ],
          text: {
            format: {
              type: 'json_schema',
              name: 'answer_analysis_result',
              strict: true,
              schema: answerAnalysisResultSchema,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI request failed: ${response.status}`);
      }

      const body = (await response.json()) as OpenAIResponsesBody;
      const result = normalizeOpenAIResult(input, parseOpenAIJson(body));
      logDevelopmentUsage('openai', performance.now() - startedAt, body.usage);
      return result;
    } catch (error) {
      logDevelopmentUsage('mock-fallback', performance.now() - startedAt);
      const fallbackResult = await this.fallbackProvider.analyzeEssay(input);
      return {
        ...fallbackResult,
        summary: OPENAI_FALLBACK_NOTICE,
      };
    }
  }
}

function buildUserPrompt(input: KnowledgeGapInput): string {
  return JSON.stringify({
    questionId: input.questionId,
    questionText: input.questionText,
    learningTheme: input.learningTheme,
    knowledgeNode: input.knowledgeNode,
    userAnswer: input.userAnswer,
    referenceAnswer: input.referenceAnswer,
    rubric: input.rubric,
    maxScore: input.maxScore,
    outputContract: {
      score: 'number',
      maxScore: input.maxScore,
      rating: 'number from 1 to 5',
      mastered: 'string[]',
      suggestedAdditions: 'string[]',
      knowledgeCoverageRate: 'number from 0 to 100',
      summary: 'short string',
      referenceAnswer: input.referenceAnswer,
      provider: 'openai',
      createdAt: 'ISO string',
    },
  });
}

function parseOpenAIJson(body: OpenAIResponsesBody): unknown {
  const text =
    body.output_text ??
    body.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text ?? '')
      .join('')
      .trim();

  if (!text) {
    throw new Error('OpenAI response did not include JSON text.');
  }

  return JSON.parse(text);
}

function normalizeOpenAIResult(input: KnowledgeGapInput, value: unknown): AnswerAnalysisResult {
  if (!isRecord(value)) {
    throw new Error('OpenAI response JSON is not an object.');
  }

  return {
    questionId: input.questionId,
    score: clampNumber(value.score, 0, input.maxScore),
    maxScore: input.maxScore,
    rating: clampNumber(value.rating, 1, 5),
    mastered: toStringArray(value.mastered),
    suggestedAdditions: toStringArray(value.suggestedAdditions),
    knowledgeCoverageRate: clampNumber(value.knowledgeCoverageRate, 0, 100),
    summary: typeof value.summary === 'string' ? value.summary : '',
    referenceAnswer: input.referenceAnswer,
    provider: 'openai',
    createdAt: new Date().toISOString(),
  };
}

function clampNumber(value: unknown, min: number, max: number): number {
  const numberValue = typeof value === 'number' && Number.isFinite(value) ? value : min;
  return Math.max(min, Math.min(max, Math.round(numberValue)));
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function logDevelopmentUsage(provider: string, responseTimeMs: number, usage?: OpenAIResponsesUsage): void {
  if (!import.meta.env.DEV) {
    return;
  }

  console.info('[AIProvider]', {
    provider,
    responseTimeMs: Math.round(responseTimeMs),
    tokenUsage: usage,
  });
}

const answerAnalysisResultSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'score',
    'maxScore',
    'rating',
    'mastered',
    'suggestedAdditions',
    'knowledgeCoverageRate',
    'summary',
    'referenceAnswer',
    'provider',
    'createdAt',
  ],
  properties: {
    score: { type: 'number' },
    maxScore: { type: 'number' },
    rating: { type: 'number' },
    mastered: {
      type: 'array',
      items: { type: 'string' },
    },
    suggestedAdditions: {
      type: 'array',
      items: { type: 'string' },
    },
    knowledgeCoverageRate: { type: 'number' },
    summary: { type: 'string' },
    referenceAnswer: { type: 'string' },
    provider: { type: 'string', enum: ['openai'] },
    createdAt: { type: 'string' },
  },
};
