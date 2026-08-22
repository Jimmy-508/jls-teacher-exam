import type { Question } from './question';
import type { WrongQuestionPdfModel } from './WrongQuestionExport';

export interface QuestionBookFilters {
  year: string;
  subject: string;
  learningTheme: string;
  searchQuery: string;
}

export interface QuestionBookFilterOptions {
  years: string[];
  subjects: string[];
  learningThemes: string[];
}

export interface QuestionBookExportItem {
  question: Question;
}

export type QuestionBookPdfModel = WrongQuestionPdfModel;
