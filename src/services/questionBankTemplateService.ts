import { QUESTION_BANK_FIELDS, QUESTION_BANK_TEMPLATE_HEADERS } from './questionBankFields';

const CSV_BOM = '\uFEFF';

const TEMPLATE_ROWS: Array<Record<string, string>> = [
  {
    [QUESTION_BANK_FIELDS.id]: 'TEMPLATE-C-001',
    [QUESTION_BANK_FIELDS.year]: '115',
    [QUESTION_BANK_FIELDS.category]: '中等學校',
    [QUESTION_BANK_FIELDS.subject]: '教育理念與實務',
    [QUESTION_BANK_FIELDS.questionNumber]: '1',
    [QUESTION_BANK_FIELDS.type]: '選擇題',
    [QUESTION_BANK_FIELDS.score]: '2',
    [QUESTION_BANK_FIELDS.learningTheme]: '教育測驗與評量',
    [QUESTION_BANK_FIELDS.coreConcept]: '形成性評量',
    [QUESTION_BANK_FIELDS.stem]: '教師在教學過程中蒐集學生學習證據並即時調整教學，最符合哪一種評量？',
    [QUESTION_BANK_FIELDS.optionA]: '總結性評量',
    [QUESTION_BANK_FIELDS.optionB]: '形成性評量',
    [QUESTION_BANK_FIELDS.optionC]: '安置性評量',
    [QUESTION_BANK_FIELDS.optionD]: '常模參照評量',
    [QUESTION_BANK_FIELDS.correctAnswer]: 'B',
    [QUESTION_BANK_FIELDS.stemAnalysis]: '題幹重點在教學過程中蒐集證據並調整教學。',
    [QUESTION_BANK_FIELDS.optionAAnalysis]: '總結性評量通常用於教學結束後判斷成果。',
    [QUESTION_BANK_FIELDS.optionBAnalysis]: '形成性評量用於教學過程中的診斷與回饋。',
    [QUESTION_BANK_FIELDS.optionCAnalysis]: '安置性評量主要用於了解起點能力。',
    [QUESTION_BANK_FIELDS.optionDAnalysis]: '常模參照評量著重與群體比較。',
    [QUESTION_BANK_FIELDS.solvingTechnique]: '注意「教學過程中」及「調整教學」。',
    [QUESTION_BANK_FIELDS.confusingConcepts]: '形成性評量與總結性評量',
    [QUESTION_BANK_FIELDS.note]: '範例資料，可刪除',
    [QUESTION_BANK_FIELDS.shortcutKeywords]: '形成性|即時回饋|診斷|調整教學',
    [QUESTION_BANK_FIELDS.coreConceptSynonyms]: '形成性評量=形成評量/過程評量',
    [QUESTION_BANK_FIELDS.bonusConcepts]: '學習證據|個別化回饋',
  },
  {
    [QUESTION_BANK_FIELDS.id]: 'TEMPLATE-C-002',
    [QUESTION_BANK_FIELDS.year]: '115',
    [QUESTION_BANK_FIELDS.category]: '中等學校',
    [QUESTION_BANK_FIELDS.subject]: '學習者發展與適性輔導',
    [QUESTION_BANK_FIELDS.questionNumber]: '2',
    [QUESTION_BANK_FIELDS.type]: '選擇題',
    [QUESTION_BANK_FIELDS.score]: '2',
    [QUESTION_BANK_FIELDS.learningTheme]: '學習理論',
    [QUESTION_BANK_FIELDS.coreConcept]: '負增強',
    [QUESTION_BANK_FIELDS.stem]: '學生完成指定作業後，教師取消原本安排的額外練習，以提高學生準時完成作業的行為。此作法屬於何者？',
    [QUESTION_BANK_FIELDS.optionA]: '正增強',
    [QUESTION_BANK_FIELDS.optionB]: '負增強',
    [QUESTION_BANK_FIELDS.optionC]: '正懲罰',
    [QUESTION_BANK_FIELDS.optionD]: '負懲罰',
    [QUESTION_BANK_FIELDS.correctAnswer]: 'B',
    [QUESTION_BANK_FIELDS.stemAnalysis]: '取消不喜歡的刺激，使目標行為增加，屬於負增強。',
    [QUESTION_BANK_FIELDS.optionAAnalysis]: '正增強是增加喜歡的刺激以提高行為。',
    [QUESTION_BANK_FIELDS.optionBAnalysis]: '負增強是移除厭惡刺激以提高行為。',
    [QUESTION_BANK_FIELDS.optionCAnalysis]: '正懲罰是增加厭惡刺激以降低行為。',
    [QUESTION_BANK_FIELDS.optionDAnalysis]: '負懲罰是移除喜歡的刺激以降低行為。',
    [QUESTION_BANK_FIELDS.solvingTechnique]: '先判斷行為增加或減少，再判斷刺激增加或移除。',
    [QUESTION_BANK_FIELDS.confusingConcepts]: '負增強與負懲罰',
    [QUESTION_BANK_FIELDS.note]: '範例資料，可刪除',
    [QUESTION_BANK_FIELDS.shortcutKeywords]: '移除厭惡刺激|行為增加|取消額外練習',
    [QUESTION_BANK_FIELDS.coreConceptSynonyms]: '負增強=消極增強',
    [QUESTION_BANK_FIELDS.bonusConcepts]: '操作制約|增強物',
  },
  {
    [QUESTION_BANK_FIELDS.id]: 'TEMPLATE-C-003',
    [QUESTION_BANK_FIELDS.year]: '115',
    [QUESTION_BANK_FIELDS.category]: '中等學校',
    [QUESTION_BANK_FIELDS.subject]: '課程教學與評量',
    [QUESTION_BANK_FIELDS.questionNumber]: '3',
    [QUESTION_BANK_FIELDS.type]: '選擇題',
    [QUESTION_BANK_FIELDS.score]: '2',
    [QUESTION_BANK_FIELDS.learningTheme]: '教育測驗與評量',
    [QUESTION_BANK_FIELDS.coreConcept]: '效標參照評量',
    [QUESTION_BANK_FIELDS.stem]: '教師依照學生是否達成事先設定的學習標準判定學習成果，此種評量方式為何？',
    [QUESTION_BANK_FIELDS.optionA]: '常模參照評量',
    [QUESTION_BANK_FIELDS.optionB]: '效標參照評量',
    [QUESTION_BANK_FIELDS.optionC]: '形成性評量',
    [QUESTION_BANK_FIELDS.optionD]: '安置性評量',
    [QUESTION_BANK_FIELDS.correctAnswer]: 'B',
    [QUESTION_BANK_FIELDS.stemAnalysis]: '判斷依據是事先設定的學習標準，而不是與其他學生比較。',
    [QUESTION_BANK_FIELDS.optionAAnalysis]: '常模參照評量著重個人在群體中的相對位置。',
    [QUESTION_BANK_FIELDS.optionBAnalysis]: '效標參照評量著重是否達到預定標準。',
    [QUESTION_BANK_FIELDS.optionCAnalysis]: '形成性評量著重教學過程中的回饋與調整。',
    [QUESTION_BANK_FIELDS.optionDAnalysis]: '安置性評量著重學習起點及分組安排。',
    [QUESTION_BANK_FIELDS.solvingTechnique]: '看到「達成標準」優先聯想到效標參照。',
    [QUESTION_BANK_FIELDS.confusingConcepts]: '效標參照與常模參照',
    [QUESTION_BANK_FIELDS.note]: '範例資料，可刪除',
    [QUESTION_BANK_FIELDS.shortcutKeywords]: '預定標準|達成目標|是否精熟',
    [QUESTION_BANK_FIELDS.coreConceptSynonyms]: '效標參照評量=標準參照評量',
    [QUESTION_BANK_FIELDS.bonusConcepts]: '精熟學習|學習目標',
  },
  {
    [QUESTION_BANK_FIELDS.id]: 'TEMPLATE-E-001',
    [QUESTION_BANK_FIELDS.year]: '115',
    [QUESTION_BANK_FIELDS.category]: '中等學校',
    [QUESTION_BANK_FIELDS.subject]: '學習者發展與適性輔導',
    [QUESTION_BANK_FIELDS.questionNumber]: '4',
    [QUESTION_BANK_FIELDS.type]: '非選題',
    [QUESTION_BANK_FIELDS.score]: '10',
    [QUESTION_BANK_FIELDS.learningTheme]: '認知學習策略',
    [QUESTION_BANK_FIELDS.coreConcept]: '精緻化與組織化',
    [QUESTION_BANK_FIELDS.stem]: '說明精緻化策略與組織化策略如何協助學習。',
    [QUESTION_BANK_FIELDS.essayReferenceAnswer]:
      '精緻化是將新知與既有知識建立有意義的連結；組織化是將資訊依概念關係整理成有結構的架構。',
    [QUESTION_BANK_FIELDS.note]: '範例資料，可刪除',
    [QUESTION_BANK_FIELDS.shortcutKeywords]: '精緻化|連結舊經驗|新舊知識連結|組織化|概念架構|分類整理',
    [QUESTION_BANK_FIELDS.coreConceptSynonyms]: '精緻化=意義連結/精緻處理|組織化=架構整理/組織策略',
    [QUESTION_BANK_FIELDS.bonusConcepts]: '提取練習|間隔練習|自我解釋',
  },
  {
    [QUESTION_BANK_FIELDS.id]: 'TEMPLATE-E-002',
    [QUESTION_BANK_FIELDS.year]: '115',
    [QUESTION_BANK_FIELDS.category]: '中等學校',
    [QUESTION_BANK_FIELDS.subject]: '課程教學與評量',
    [QUESTION_BANK_FIELDS.questionNumber]: '5',
    [QUESTION_BANK_FIELDS.type]: '非選題',
    [QUESTION_BANK_FIELDS.score]: '10',
    [QUESTION_BANK_FIELDS.learningTheme]: '教育測驗與評量',
    [QUESTION_BANK_FIELDS.coreConcept]: '多元評量',
    [QUESTION_BANK_FIELDS.stem]: '請說明教師在教學中採用多元評量的意義與做法。',
    [QUESTION_BANK_FIELDS.essayReferenceAnswer]:
      '多元評量是依據不同學習目標，採用紙筆測驗、實作、觀察、檔案及口頭報告等多種方式蒐集學習證據，以了解學生不同面向的學習表現。',
    [QUESTION_BANK_FIELDS.note]: '範例資料，可刪除',
    [QUESTION_BANK_FIELDS.shortcutKeywords]: '多種方式|紙筆測驗|實作評量|觀察|檔案評量|口頭報告|學習證據',
    [QUESTION_BANK_FIELDS.coreConceptSynonyms]: '多元評量=多樣化評量/多重評量方式',
    [QUESTION_BANK_FIELDS.bonusConcepts]: '個別差異|真實評量|形成性回饋',
  },
];

export function escapeCsvValue(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

export function createCsvRow(values: readonly string[]): string {
  return values.map(escapeCsvValue).join(',');
}

export function buildQuestionBankTemplateCsv(): string {
  const rows = [
    createCsvRow(QUESTION_BANK_TEMPLATE_HEADERS),
    ...TEMPLATE_ROWS.map((row) => createCsvRow(QUESTION_BANK_TEMPLATE_HEADERS.map((header) => row[header] ?? ''))),
  ];

  return `${CSV_BOM}${rows.join('\r\n')}\r\n`;
}
