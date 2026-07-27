import { getStoredQuestionImageAsset } from './questionBankIndexedDbService';

export const QUESTION_IMAGE_ASSET_PREFIX = 'jls-question-image:';

export const QUESTION_IMAGE_FIELDS = [
  'stemImage',
  'optionAImage',
  'optionBImage',
  'optionCImage',
  'optionDImage',
] as const;

export type QuestionImageField = (typeof QUESTION_IMAGE_FIELDS)[number];

export function createQuestionImageAssetReference(assetId: string): string {
  return QUESTION_IMAGE_ASSET_PREFIX + assetId;
}

export function isQuestionImageAssetReference(value: string | undefined): value is string {
  return typeof value === 'string' && value.startsWith(QUESTION_IMAGE_ASSET_PREFIX);
}

export function getQuestionImageAssetId(value: string): string {
  return value.slice(QUESTION_IMAGE_ASSET_PREFIX.length);
}

export function isExternalQuestionImageSource(value: string): boolean {
  return /^(https?:|data:|blob:)/i.test(value.trim());
}

export async function resolveQuestionImageSource(value: string): Promise<string> {
  if (!isQuestionImageAssetReference(value)) {
    return value;
  }

  const asset = await getStoredQuestionImageAsset(getQuestionImageAssetId(value));

  if (!asset) {
    throw new Error('Question image asset was not found.');
  }

  return URL.createObjectURL(asset.blob);
}
