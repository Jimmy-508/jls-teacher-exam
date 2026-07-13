import type { QuestionBankIdentity, QuestionIdentitySnapshot } from '../services/questionBankIdentityService';

export interface JlsBackup {
  app: 'JLS';
  backupVersion: 1 | 2;
  createdAt: string;
  appVersion: string;
  includesQuestionBank: false;
  questionBankIdentity?: QuestionBankIdentity;
  learningRecordQuestionIdentities?: Record<string, QuestionIdentitySnapshot>;
  data: {
    storage: Record<string, unknown>;
  };
}

export interface BackupValidationResult {
  isValid: boolean;
  errors: string[];
  backup?: JlsBackup;
}

export interface RestorePreview {
  createdAt: string;
  backupVersion: number;
  includesQuestionBank: false;
  storageKeys: string[];
}
