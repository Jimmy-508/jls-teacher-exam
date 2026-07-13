import { getOpenAIApiKey, hasOpenAIApiKey, openAIConfig, type OpenAIConfig } from '../../config/openai';
import type { ChoiceExplanation } from '../../types/ChoiceExplanation';
import type { ChoiceKey, Question } from '../../types/question';
import type { AIProvider } from './AIProvider';
import { MockAIProvider } from './MockAIProvider';

interface OpenAIChoiceProviderOptions extends Partial<OpenAIConfig> {
  fallbackProvider?: AIProvider;
  fetchFn?: typeof fetch;
}

interface OpenAIChoiceResponse {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
    }>;
  }>;
}

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const OPENAI_FALLBACK_NOTICE = 'OpenAI 分析失敗，已改用 Mock 分析。';
const SYSTEM_PROMPT = [
  'You are a teacher certification learning coach.',
  'Return JSON only matching the ChoiceExplanation shape.',
  'Use Traditional Chinese.',
  'Analyze the specific question content and the selected answer.',
  'The response must include: questionKeyPoint, optionAnalysis A/B/C/D, learningFeedback, extendedLearning.',
  'For optionAnalysis, each option must explain why that option is correct or wrong using the actual option text.',
  'Do not reuse one generic sentence for all wrong options.',
  'Avoid vague phrases unless followed by specific concepts and reasons: 容易被關鍵字吸引, 判斷時要回到題幹條件, 避免混淆概念, 這個選項未能完整對應.',
].join('\n');

export class OpenAIProvider implements AIProvider {
  private readonly apiKey: string;
  private readonly fallbackProvider: AIProvider;
  private readonly fetchFn: typeof fetch;
  private readonly maxTokens: number;
  private readonly model: string;
  private readonly temperature: number;

  constructor(options: OpenAIChoiceProviderOptions = {}) {
    this.apiKey = options.apiKey ?? getOpenAIApiKey();
    this.fallbackProvider = options.fallbackProvider ?? new MockAIProvider();
    this.fetchFn = options.fetchFn ?? fetch;
    this.maxTokens = options.maxTokens ?? openAIConfig.maxTokens;
    this.model = options.model ?? openAIConfig.model;
    this.temperature = options.temperature ?? openAIConfig.temperature;
  }

  async explainChoiceQuestion(question: Question, userAnswer: ChoiceKey): Promise<ChoiceExplanation> {
    if (!hasOpenAIApiKey(this.apiKey)) {
      return this.fallbackProvider.explainChoiceQuestion(question, userAnswer);
    }

    try {
      const response = await this.fetchFn(OPENAI_RESPONSES_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          temperature: this.temperature,
          max_output_tokens: this.maxTokens,
          input: [
            {
              role: 'system',
              content: SYSTEM_PROMPT,
            },
            {
              role: 'user',
              content: JSON.stringify({
                questionId: question.id,
                stem: question.stem,
                subject: question.subject,
                learningTheme: question.learningTheme,
                knowledgeNode: question.knowledgeNode,
                options: {
                  A: question.optionA ?? '',
                  B: question.optionB ?? '',
                  C: question.optionC ?? '',
                  D: question.optionD ?? '',
                },
                correctAnswer: question.correctAnswer,
                userAnswer,
                outputContract: {
                  questionKeyPoint: '說明這題真正考什麼。',
                  optionAnalysis: {
                    A: 'A ✅/❌ + 針對 A 選項內容的具體說明',
                    B: 'B ✅/❌ + 針對 B 選項內容的具體說明',
                    C: 'C ✅/❌ + 針對 C 選項內容的具體說明',
                    D: 'D ✅/❌ + 針對 D 選項內容的具體說明',
                  },
                  learningFeedback: '依使用者選擇分析思考盲點。',
                  extendedLearning: {
                    relatedKnowledgeNodes: ['string[]'],
                    confusingConcepts: ['string[]'],
                    relatedExamPoints: ['string[]'],
                    recommendedPracticeCount: 'number',
                  },
                },
              }),
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI choice explanation failed: ${response.status}`);
      }

      const body = (await response.json()) as OpenAIChoiceResponse;
      return normalizeChoiceExplanation(question, parseOpenAIJson(body));
    } catch {
      const fallbackExplanation = await this.fallbackProvider.explainChoiceQuestion(question, userAnswer);
      return {
        ...fallbackExplanation,
        questionKeyPoint: OPENAI_FALLBACK_NOTICE,
        learningFeedback: OPENAI_FALLBACK_NOTICE,
      };
    }
  }
}

function parseOpenAIJson(body: OpenAIChoiceResponse): unknown {
  const text =
    body.output_text ??
    body.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text ?? '')
      .join('')
      .trim();

  if (!text) {
    throw new Error('OpenAI choice explanation response did not include JSON.');
  }

  return JSON.parse(text);
}

function normalizeChoiceExplanation(question: Question, value: unknown): ChoiceExplanation {
  if (!isRecord(value)) {
    throw new Error('OpenAI choice explanation JSON is not an object.');
  }

  const optionAnalysis = isRecord(value.optionAnalysis) ? value.optionAnalysis : {};
  const extendedLearning = getNestedValue(value, 'extendedLearning');

  return {
    questionId: question.id,
    questionKeyPoint: toString(value.questionKeyPoint),
    optionAnalysis: {
      A: toString(optionAnalysis.A),
      B: toString(optionAnalysis.B),
      C: toString(optionAnalysis.C),
      D: toString(optionAnalysis.D),
    },
    learningFeedback: toString(value.learningFeedback),
    extendedLearning: {
      relatedKnowledgeNodes: toStringArray(getNestedValue(extendedLearning, 'relatedKnowledgeNodes')),
      confusingConcepts: toStringArray(getNestedValue(extendedLearning, 'confusingConcepts')),
      relatedExamPoints: toStringArray(getNestedValue(extendedLearning, 'relatedExamPoints')),
      recommendedPracticeCount: toOptionalNumber(getNestedValue(extendedLearning, 'recommendedPracticeCount')),
    },
    provider: 'openai',
    createdAt: new Date().toISOString(),
  };
}

function getNestedValue(value: unknown, key: string): unknown {
  return isRecord(value) ? value[key] : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function toString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}
