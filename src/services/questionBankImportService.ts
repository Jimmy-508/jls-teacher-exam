import type { Question } from '../types/question';
import { decodeQuestionBankCsvBuffer, readQuestionBankCsvFile } from './csvService';
import {
  QUESTION_IMAGE_FIELDS,
  createQuestionImageAssetReference,
  isExternalQuestionImageSource,
  type QuestionImageField,
} from './questionImageAssetService';
import type { StoredQuestionImageAsset } from './questionBankIndexedDbService';
import { parseAndValidateQuestionBankCsv, type ParsedQuestionBank } from './questionBankValidator';

interface ZipEntryData {
  name: string;
  bytes: Uint8Array;
  isDirectory: boolean;
}

interface ZipDirectoryEntry {
  name: string;
  method: number;
  compressedSize: number;
  localHeaderOffset: number;
  isDirectory: boolean;
}

export interface ParsedQuestionBankImportFile {
  csvText: string;
  parsedQuestionBank: ParsedQuestionBank;
  imageAssets: StoredQuestionImageAsset[];
}

const CSV_EXTENSION = '.csv';
const IMAGE_EXTENSION_MIME_TYPES = new Map([
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
]);

export async function readQuestionBankImportFile(file: File): Promise<ParsedQuestionBankImportFile> {
  if (isZipFile(file)) {
    return readQuestionBankZipFile(file);
  }

  const csvText = await readQuestionBankCsvFile(file);
  return {
    csvText,
    parsedQuestionBank: parseAndValidateQuestionBankCsv(csvText),
    imageAssets: [],
  };
}

async function readQuestionBankZipFile(file: File): Promise<ParsedQuestionBankImportFile> {
  const entries = await readZipEntries(await file.arrayBuffer());
  const fileEntries = entries.filter((entry) => !entry.isDirectory);
  const csvEntries = fileEntries.filter((entry) => normalizeZipPath(entry.name)?.toLowerCase().endsWith(CSV_EXTENSION));

  if (csvEntries.length === 0) {
    throw new Error('ZIP import failed: exactly one CSV file is required.');
  }

  if (csvEntries.length > 1) {
    throw new Error('ZIP import failed: multiple CSV files were found.');
  }

  const csvText = decodeQuestionBankCsvBuffer(toArrayBuffer(csvEntries[0].bytes));
  const parsedQuestionBank = parseAndValidateQuestionBankCsv(csvText);

  if (!parsedQuestionBank.validation.isValid) {
    return { csvText, parsedQuestionBank, imageAssets: [] };
  }

  const imageEntries = buildImageEntryIndex(fileEntries);
  const resolved = resolveQuestionImageReferences(parsedQuestionBank.questions, imageEntries);

  return {
    csvText,
    parsedQuestionBank: {
      ...parsedQuestionBank,
      questions: resolved.questions,
    },
    imageAssets: resolved.imageAssets,
  };
}

function isZipFile(file: File): boolean {
  return file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed';
}

function buildImageEntryIndex(entries: readonly ZipEntryData[]) {
  const byPath = new Map<string, ZipEntryData>();
  const byBasename = new Map<string, ZipEntryData[]>();

  entries.forEach((entry) => {
    const normalizedPath = normalizeZipPath(entry.name);

    if (!normalizedPath || !isSupportedImagePath(normalizedPath)) {
      return;
    }

    const lookupPath = toLookupKey(normalizedPath);
    const basename = getBasename(normalizedPath);
    const basenameKey = toLookupKey(basename);

    byPath.set(lookupPath, { ...entry, name: normalizedPath });
    byBasename.set(basenameKey, [...(byBasename.get(basenameKey) ?? []), { ...entry, name: normalizedPath }]);
  });

  return { byPath, byBasename };
}

function resolveQuestionImageReferences(
  questions: readonly Question[],
  imageEntries: ReturnType<typeof buildImageEntryIndex>,
): { questions: Question[]; imageAssets: StoredQuestionImageAsset[] } {
  const usedAssets = new Map<string, StoredQuestionImageAsset>();
  const updatedAt = new Date().toISOString();
  const questionsWithImages = questions.map((question) => {
    let changed = false;
    const nextQuestion: Question = { ...question };

    QUESTION_IMAGE_FIELDS.forEach((field) => {
      const rawValue = nextQuestion[field];
      const value = typeof rawValue === 'string' ? rawValue.trim() : '';

      if (!value) {
        nextQuestion[field] = undefined;
        return;
      }

      if (isExternalQuestionImageSource(value)) {
        if (value !== rawValue) {
          nextQuestion[field] = value;
          changed = true;
        }
        return;
      }

      const entry = findReferencedImageEntry(value, field, question.id, imageEntries);
      const assetId = createAssetId(entry.name);
      nextQuestion[field] = createQuestionImageAssetReference(assetId);
      changed = true;

      if (!usedAssets.has(assetId)) {
        usedAssets.set(assetId, {
          id: assetId,
          fileName: entry.name,
          mimeType: getImageMimeType(entry.name),
          blob: new Blob([toArrayBuffer(entry.bytes)], { type: getImageMimeType(entry.name) }),
          updatedAt,
        });
      }
    });

    return changed ? nextQuestion : question;
  });

  return {
    questions: questionsWithImages,
    imageAssets: [...usedAssets.values()],
  };
}

function findReferencedImageEntry(
  value: string,
  field: QuestionImageField,
  questionId: string,
  imageEntries: ReturnType<typeof buildImageEntryIndex>,
): ZipEntryData {
  const normalizedRef = normalizeZipPath(value);

  if (!normalizedRef) {
    throw new Error(`ZIP import failed: invalid image path "${value}" in ${field} for question ${questionId}.`);
  }

  const exactMatch = imageEntries.byPath.get(toLookupKey(normalizedRef));

  if (exactMatch) {
    return exactMatch;
  }

  const basenameMatches = imageEntries.byBasename.get(toLookupKey(getBasename(normalizedRef))) ?? [];

  if (basenameMatches.length === 1) {
    return basenameMatches[0];
  }

  if (basenameMatches.length > 1) {
    throw new Error(`ZIP import failed: ambiguous image reference "${value}" in ${field} for question ${questionId}.`);
  }

  throw new Error(`ZIP import failed: missing image "${value}" in ${field} for question ${questionId}.`);
}

function createAssetId(path: string): string {
  return 'zip/' + encodeURIComponent(path);
}

function normalizeZipPath(value: string): string | null {
  let normalized = decodeUnicodeFilename(value.trim()).replace(/\\/g, '/');

  while (normalized.startsWith('./')) {
    normalized = normalized.slice(2);
  }

  if (!normalized || normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized)) {
    return null;
  }

  const segments = normalized.split('/').filter((segment) => segment.length > 0);

  if (segments.some((segment) => segment === '..')) {
    return null;
  }

  return segments.join('/');
}

function decodeUnicodeFilename(value: string): string {
  return value.replace(/#U([0-9A-Fa-f]{4})/g, (_, code: string) => String.fromCharCode(Number.parseInt(code, 16)));
}

function isSupportedImagePath(path: string): boolean {
  return IMAGE_EXTENSION_MIME_TYPES.has(getExtension(path));
}

function getImageMimeType(path: string): string {
  return IMAGE_EXTENSION_MIME_TYPES.get(getExtension(path)) ?? 'application/octet-stream';
}

function getExtension(path: string): string {
  const basename = getBasename(path);
  const dotIndex = basename.lastIndexOf('.');
  return dotIndex >= 0 ? basename.slice(dotIndex).toLowerCase() : '';
}

function getBasename(path: string): string {
  const segments = path.split('/');
  return segments[segments.length - 1] ?? path;
}

function toLookupKey(value: string): string {
  return value.normalize('NFC').toLowerCase();
}

async function readZipEntries(buffer: ArrayBuffer): Promise<ZipEntryData[]> {
  const bytes = new Uint8Array(buffer);
  const directoryEntries = readCentralDirectory(bytes);

  return Promise.all(
    directoryEntries.map(async (entry) => ({
      name: entry.name,
      isDirectory: entry.isDirectory,
      bytes: entry.isDirectory ? new Uint8Array() : await readZipEntryBytes(bytes, entry),
    })),
  );
}

function readCentralDirectory(bytes: Uint8Array): ZipDirectoryEntry[] {
  const eocdOffset = findEndOfCentralDirectory(bytes);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const entryCount = view.getUint16(eocdOffset + 10, true);
  let offset = view.getUint32(eocdOffset + 16, true);
  const entries: ZipDirectoryEntry[] = [];

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) {
      throw new Error('ZIP import failed: invalid central directory.');
    }

    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const nameBytes = bytes.slice(offset + 46, offset + 46 + nameLength);
    const name = decodeZipFileName(nameBytes, flags);

    entries.push({
      name,
      method,
      compressedSize,
      localHeaderOffset,
      isDirectory: name.endsWith('/'),
    });

    offset += 46 + nameLength + extraLength + commentLength;
  }

  return entries;
}

async function readZipEntryBytes(bytes: Uint8Array, entry: ZipDirectoryEntry): Promise<Uint8Array> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const offset = entry.localHeaderOffset;

  if (view.getUint32(offset, true) !== 0x04034b50) {
    throw new Error('ZIP import failed: invalid local file header.');
  }

  const nameLength = view.getUint16(offset + 26, true);
  const extraLength = view.getUint16(offset + 28, true);
  const dataStart = offset + 30 + nameLength + extraLength;
  const compressedBytes = bytes.slice(dataStart, dataStart + entry.compressedSize);

  if (entry.method === 0) {
    return compressedBytes;
  }

  if (entry.method === 8) {
    return inflateRaw(compressedBytes);
  }

  throw new Error('ZIP import failed: unsupported ZIP compression method.');
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const DecompressionStreamConstructor = globalThis.DecompressionStream;

  if (!DecompressionStreamConstructor) {
    throw new Error('ZIP import failed: this browser cannot decompress ZIP files. Please use an uncompressed ZIP or import CSV.');
  }

  const stream = new Blob([toArrayBuffer(bytes)]).stream().pipeThrough(new DecompressionStreamConstructor('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function findEndOfCentralDirectory(bytes: Uint8Array): number {
  for (let offset = bytes.length - 22; offset >= 0; offset -= 1) {
    if (
      bytes[offset] === 0x50 &&
      bytes[offset + 1] === 0x4b &&
      bytes[offset + 2] === 0x05 &&
      bytes[offset + 3] === 0x06
    ) {
      return offset;
    }
  }

  throw new Error('ZIP import failed: invalid ZIP file.');
}

function decodeZipFileName(bytes: Uint8Array, flags: number): string {
  const encoding = flags & 0x0800 ? 'utf-8' : 'utf-8';
  return new TextDecoder(encoding).decode(bytes);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
