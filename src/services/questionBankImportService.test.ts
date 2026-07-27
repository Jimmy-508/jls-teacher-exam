import { describe, expect, it } from 'vitest';
import { readQuestionBankImportFile } from './questionBankImportService';
import { isQuestionImageAssetReference } from './questionImageAssetService';

const oldCsv = [
  'id,year,category,subject,questionNumber,type,score,learningTheme,coreConcept,stem,optionA,optionB,optionC,optionD,correctAnswer',
  'Q1,115,teacher,Subject,1,choice,1,Theme,Concept,Stem,A,B,C,D,A',
].join('\n');

const imageCsv = [
  'id,year,category,subject,questionNumber,type,score,learningTheme,coreConcept,stem,optionA,optionB,optionC,optionD,correctAnswer,questionImage,aImage,bImage,cImage,dImage,imageNote',
  'Q1,115,teacher,Subject,1,choice,1,Theme,Concept,Stem,A,B,C,D,A,images/stem.png,a.png,b.jpg,c.webp,d.jpeg,Image note',
].join('\n');

describe('questionBankImportService', () => {
  it('keeps CSV-only imports compatible without image assets', async () => {
    const result = await readQuestionBankImportFile(new File([oldCsv], 'questions.csv', { type: 'text/csv' }));

    expect(result.parsedQuestionBank.validation.isValid).toBe(true);
    expect(result.parsedQuestionBank.questions).toHaveLength(1);
    expect(result.parsedQuestionBank.questions[0].stemImage).toBeUndefined();
    expect(result.imageAssets).toHaveLength(0);
  });

  it('reads a ZIP with one CSV and referenced images', async () => {
    const zip = createStoredZip({
      'questions.csv': imageCsv,
      'images/stem.png': 'stem image',
      'images/a.png': 'a image',
      'images/b.jpg': 'b image',
      'images/c.webp': 'c image',
      'images/d.jpeg': 'd image',
      'unused.png': 'unused image',
    });

    const result = await readQuestionBankImportFile(new File([toArrayBuffer(zip)], 'questions.zip', { type: 'application/zip' }));
    const question = result.parsedQuestionBank.questions[0];

    expect(result.parsedQuestionBank.validation.isValid).toBe(true);
    expect(isQuestionImageAssetReference(question.stemImage)).toBe(true);
    expect(isQuestionImageAssetReference(question.optionAImage)).toBe(true);
    expect(isQuestionImageAssetReference(question.optionBImage)).toBe(true);
    expect(isQuestionImageAssetReference(question.optionCImage)).toBe(true);
    expect(isQuestionImageAssetReference(question.optionDImage)).toBe(true);
    expect(question.imageNote).toBe('Image note');
    expect(result.imageAssets.map((asset) => asset.fileName).sort()).toEqual([
      'images/a.png',
      'images/b.jpg',
      'images/c.webp',
      'images/d.jpeg',
      'images/stem.png',
    ]);
  });

  it('reads option image header variants and trims image references', async () => {
    const csv = [
      'id,year,category,subject,questionNumber,type,score,learningTheme,coreConcept,stem,optionA,optionB,optionC,optionD,correctAnswer,questionImage,\u9078\u9805A\u5716\u7247,\uff22\u5716\u7247,C \u5716\u7247,D\u5716\u7247,\u5716\u7247\u5099\u8a3b',
      'Q1,115,teacher,Subject,1,choice,1,Theme,Concept,Stem,A,B,C,D,A, images/stem.png , shared.png , images/\u570b.png , c.webp , d.jpeg , Trimmed note ',
    ].join('\n');
    const zip = createStoredZip({
      'questions.csv': csv,
      'images/stem.png': 'stem image',
      'folder/shared.png': 'a image',
      'images/#U570B.png': 'b image',
      'images/c.webp': 'c image',
      'images/d.jpeg': 'd image',
    });

    const result = await readQuestionBankImportFile(new File([toArrayBuffer(zip)], 'questions.zip', { type: 'application/zip' }));
    const question = result.parsedQuestionBank.questions[0];

    expect(isQuestionImageAssetReference(question.stemImage)).toBe(true);
    expect(question.optionAImage).toContain('folder%2Fshared.png');
    expect(question.optionBImage).toContain(encodeURIComponent('images/\u570b.png'));
    expect(question.optionCImage).toContain('images%2Fc.webp');
    expect(question.optionDImage).toContain('images%2Fd.jpeg');
    expect(question.imageNote).toBe('Trimmed note');
    expect(result.imageAssets.map((asset) => asset.fileName).sort()).toEqual([
      'folder/shared.png',
      'images/c.webp',
      'images/d.jpeg',
      'images/stem.png',
      'images/\u570b.png',
    ]);
  });

  it('shares one stored asset when multiple option image fields reference the same file', async () => {
    const csv = imageCsv.replace('a.png,b.jpg,c.webp,d.jpeg', 'shared.png,shared.png,shared.png,shared.png');
    const zip = createStoredZip({
      'questions.csv': csv,
      'images/stem.png': 'stem image',
      'images/shared.png': 'shared option image',
    });

    const result = await readQuestionBankImportFile(new File([toArrayBuffer(zip)], 'questions.zip', { type: 'application/zip' }));
    const question = result.parsedQuestionBank.questions[0];
    const optionReferences = [question.optionAImage, question.optionBImage, question.optionCImage, question.optionDImage];

    expect(new Set(optionReferences).size).toBe(1);
    expect(result.imageAssets.map((asset) => asset.fileName).sort()).toEqual(['images/shared.png', 'images/stem.png']);
  });

  it('matches image references by basename', async () => {
    const csv = imageCsv.replace('images/stem.png', 'stem.png');
    const zip = createStoredZip({
      'questions.csv': csv,
      'images/stem.png': 'stem image',
      'images/a.png': 'a image',
      'images/b.jpg': 'b image',
      'images/c.webp': 'c image',
      'images/d.jpeg': 'd image',
    });

    const result = await readQuestionBankImportFile(new File([toArrayBuffer(zip)], 'questions.zip', { type: 'application/zip' }));

    expect(result.parsedQuestionBank.questions[0].stemImage).toContain('images%2Fstem.png');
  });

  it('decodes #UXXXX filenames before matching', async () => {
    const csv = imageCsv.replace('images/stem.png', '\u570B.png');
    const zip = createStoredZip({
      'questions.csv': csv,
      'images/#U570B.png': 'stem image',
      'images/a.png': 'a image',
      'images/b.jpg': 'b image',
      'images/c.webp': 'c image',
      'images/d.jpeg': 'd image',
    });

    const result = await readQuestionBankImportFile(new File([toArrayBuffer(zip)], 'questions.zip', { type: 'application/zip' }));

    expect(result.parsedQuestionBank.questions[0].stemImage).toContain(encodeURIComponent('images/\u570B.png'));
  });

  it('fails when a ZIP has no CSV file', async () => {
    const zip = createStoredZip({ 'image.png': 'image' });

    await expect(readQuestionBankImportFile(new File([toArrayBuffer(zip)], 'questions.zip', { type: 'application/zip' }))).rejects.toThrow(
      /exactly one CSV/i,
    );
  });

  it('fails when a ZIP has multiple CSV files', async () => {
    const zip = createStoredZip({ 'one.csv': oldCsv, 'two.csv': oldCsv });

    await expect(readQuestionBankImportFile(new File([toArrayBuffer(zip)], 'questions.zip', { type: 'application/zip' }))).rejects.toThrow(
      /multiple CSV/i,
    );
  });

  it('fails when a referenced image is missing', async () => {
    const zip = createStoredZip({ 'questions.csv': imageCsv, 'images/a.png': 'a image' });

    await expect(readQuestionBankImportFile(new File([toArrayBuffer(zip)], 'questions.zip', { type: 'application/zip' }))).rejects.toThrow(
      /missing image/i,
    );
  });

  it('rejects unsafe image paths', async () => {
    const csv = imageCsv.replace('images/stem.png', '../stem.png');
    const zip = createStoredZip({
      'questions.csv': csv,
      'stem.png': 'stem image',
      'images/a.png': 'a image',
      'images/b.jpg': 'b image',
      'images/c.webp': 'c image',
      'images/d.jpeg': 'd image',
    });

    await expect(readQuestionBankImportFile(new File([toArrayBuffer(zip)], 'questions.zip', { type: 'application/zip' }))).rejects.toThrow(
      /invalid image path/i,
    );
  });
});

function createStoredZip(files: Record<string, string>): Uint8Array {
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const centralDirectory: Uint8Array[] = [];
  let offset = 0;

  Object.entries(files).forEach(([name, content]) => {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(content);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const local = new DataView(localHeader.buffer);
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(8, 0, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, nameBytes.length, true);
    localHeader.set(nameBytes, 30);
    chunks.push(localHeader, data);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const central = new DataView(centralHeader.buffer);
    central.setUint32(0, 0x02014b50, true);
    central.setUint16(4, 20, true);
    central.setUint16(6, 20, true);
    central.setUint16(10, 0, true);
    central.setUint32(20, data.length, true);
    central.setUint32(24, data.length, true);
    central.setUint16(28, nameBytes.length, true);
    central.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);
    centralDirectory.push(centralHeader);

    offset += localHeader.length + data.length;
  });

  const centralDirectoryOffset = offset;
  const centralDirectorySize = centralDirectory.reduce((sum, chunk) => sum + chunk.length, 0);
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(8, centralDirectory.length, true);
  eocdView.setUint16(10, centralDirectory.length, true);
  eocdView.setUint32(12, centralDirectorySize, true);
  eocdView.setUint32(16, centralDirectoryOffset, true);

  return concatUint8Arrays([...chunks, ...centralDirectory, eocd]);
}

function concatUint8Arrays(chunks: readonly Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  chunks.forEach((chunk) => {
    result.set(chunk, offset);
    offset += chunk.length;
  });

  return result;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
