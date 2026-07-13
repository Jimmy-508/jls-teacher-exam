import type { Question } from './question';

export interface WrongQuestionFilters {
  year: string;
  subject: string;
  learningTheme: string;
}

export interface WrongQuestionExportOptions {
  displayName: string;
  filters: WrongQuestionFilters;
  questions: readonly Question[];
}

export interface WrongQuestionExportItem {
  question: Question;
  wrongCount: number;
}

export interface WrongQuestionPdfModel {
  title: string;
  fileName: string;
  generatedAt: string;
  formattedExportDate: string;
  items: WrongQuestionExportItem[];
  questionLines: string[];
  analysisLines: string[];
}
