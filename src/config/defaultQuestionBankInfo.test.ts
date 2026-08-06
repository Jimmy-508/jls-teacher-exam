// @ts-ignore - Vitest runs this assertion file in Node, but the app tsconfig does not include Node types.
import { readFileSync } from 'node:fs';
// @ts-ignore - Vitest runs this assertion file in Node, but the app tsconfig does not include Node types.
import { resolve } from 'node:path';
declare const __dirname: string;
import { describe, expect, it } from 'vitest';
import { DEFAULT_QUESTION_BANK_VERSION } from './defaultQuestionBankInfo';

const viteConfig = readFileSync(resolve(__dirname, '../../vite.config.ts'), 'utf8');

describe('defaultQuestionBankInfo', () => {
  it('defines a dedicated default question bank version', () => {
    expect(DEFAULT_QUESTION_BANK_VERSION).toMatch(/^\d{4}\.\d{2}\.\d{2}\.\d+$/);
  });

  it('uses the dedicated default question bank version for the Vite runtime cache name', () => {
    expect(viteConfig).toContain("import { DEFAULT_QUESTION_BANK_VERSION } from './src/config/defaultQuestionBankInfo';");
    expect(viteConfig).toContain('cacheName: `jls-default-question-bank-${DEFAULT_QUESTION_BANK_VERSION}`');
  });
});
