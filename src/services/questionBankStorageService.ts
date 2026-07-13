import { load, remove, save } from './storageService';
import { JLS_IMPORTED_QUESTION_BANK_STORAGE_KEY } from './storageKeys';

const DEFAULT_QUESTION_BANK_PATH = `${import.meta.env.BASE_URL}questions.csv`;

export interface ImportedQuestionBank {
  csvText: string;
  importedAt: string;
}

export interface ActiveQuestionBank {
  csvText: string;
  source: 'default' | 'imported';
  importedAt?: string;
}

export async function getImportedQuestionBank(): Promise<ImportedQuestionBank | null> {
  return load<ImportedQuestionBank>(JLS_IMPORTED_QUESTION_BANK_STORAGE_KEY);
}

export async function saveImportedQuestionBank(csvText: string): Promise<void> {
  await save<ImportedQuestionBank>(JLS_IMPORTED_QUESTION_BANK_STORAGE_KEY, {
    csvText,
    importedAt: new Date().toISOString(),
  });
}

export async function resetImportedQuestionBank(): Promise<void> {
  await remove(JLS_IMPORTED_QUESTION_BANK_STORAGE_KEY);
}

export async function getActiveQuestionBank(): Promise<ActiveQuestionBank> {
  const importedQuestionBank = await getImportedQuestionBank();

  if (importedQuestionBank) {
    return {
      csvText: importedQuestionBank.csvText,
      importedAt: importedQuestionBank.importedAt,
      source: 'imported',
    };
  }

  const response = await fetch(DEFAULT_QUESTION_BANK_PATH);

  if (!response.ok) {
    throw new Error('無法讀取 public/questions.csv。');
  }

  return {
    csvText: await response.text(),
    source: 'default',
  };
}
