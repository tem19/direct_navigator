import type { Ad, AdGroup, Campaign, Keyword } from '../types';
import { DIRECT_LIMITS } from './limits';

export interface ValidationError {
  field: string;
  message: string;
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: ValidationError[] };

function collect(errors: ValidationError[]): ValidationResult {
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

export function validateCampaign(c: Pick<Campaign, 'name'>): ValidationResult {
  const errors: ValidationError[] = [];
  if (!c.name.trim()) {
    errors.push({ field: 'name', message: 'Название кампании обязательно' });
  }
  if (c.name.length > DIRECT_LIMITS.campaign.nameMax) {
    errors.push({
      field: 'name',
      message: `Название длиннее ${DIRECT_LIMITS.campaign.nameMax} символов`,
    });
  }
  return collect(errors);
}

export function validateAdGroup(g: Pick<AdGroup, 'name' | 'regionIds'>): ValidationResult {
  const errors: ValidationError[] = [];
  if (!g.name.trim()) {
    errors.push({ field: 'name', message: 'Название группы обязательно' });
  }
  if (g.name.length > DIRECT_LIMITS.adgroup.nameMax) {
    errors.push({ field: 'name', message: `Название длиннее ${DIRECT_LIMITS.adgroup.nameMax}` });
  }
  if (g.regionIds.length > DIRECT_LIMITS.adgroup.maxRegions) {
    errors.push({ field: 'regionIds', message: 'Слишком много регионов' });
  }
  return collect(errors);
}

export function validateAd(a: Pick<Ad, 'title' | 'title2' | 'text'>): ValidationResult {
  const errors: ValidationError[] = [];
  const { titleMax, title2Max, textMax } = DIRECT_LIMITS.ad;
  if (!a.title.trim()) {
    errors.push({ field: 'title', message: 'Заголовок обязателен' });
  }
  if (a.title.length > titleMax) {
    errors.push({ field: 'title', message: `Заголовок длиннее ${titleMax} символов` });
  }
  if (a.title2 && a.title2.length > title2Max) {
    errors.push({ field: 'title2', message: `Заголовок 2 длиннее ${title2Max} символов` });
  }
  if (!a.text.trim()) {
    errors.push({ field: 'text', message: 'Текст объявления обязателен' });
  }
  if (a.text.length > textMax) {
    errors.push({ field: 'text', message: `Текст длиннее ${textMax} символов` });
  }
  return collect(errors);
}

export function validateKeyword(k: Pick<Keyword, 'keyword' | 'bid'>): ValidationResult {
  const errors: ValidationError[] = [];
  const { phraseMax, maxWords, minBid } = DIRECT_LIMITS.keyword;
  const phrase = k.keyword.trim();
  if (!phrase) {
    errors.push({ field: 'keyword', message: 'Ключевая фраза обязательна' });
  }
  if (phrase.length > phraseMax) {
    errors.push({ field: 'keyword', message: `Фраза длиннее ${phraseMax} символов` });
  }
  // Слова без минус-слов (минус-слова начинаются с "-").
  const positiveWords = phrase
    .split(/\s+/)
    .filter((w) => w.length > 0 && !w.startsWith('-'));
  if (positiveWords.length > maxWords) {
    errors.push({ field: 'keyword', message: `Больше ${maxWords} слов во фразе` });
  }
  if (k.bid !== null && k.bid < minBid) {
    errors.push({ field: 'bid', message: `Ставка ниже минимальной (${minBid})` });
  }
  return collect(errors);
}
