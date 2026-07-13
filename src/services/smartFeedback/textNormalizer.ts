export function normalizeText(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[，。！？、；：「」『』（）()[\]{}.,!?;:'"“”‘’/\\|_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/([\u4e00-\u9fff])\s+([\u4e00-\u9fff])/g, '$1$2')
    .trim();
}

export function normalizeTerm(value: string): string {
  return normalizeText(value).replace(/\s+/g, '');
}
