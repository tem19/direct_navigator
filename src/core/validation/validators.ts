import type { NewAd, NewAdGroup, NewCampaign, NewClient, NewKeyword } from '../types';
import { AD_TYPES } from '../types/ad';
import { AD_GROUP_TYPES } from '../types/adGroup';
import { CAMPAIGN_TYPES } from '../types/campaign';
import { DIRECT_LIMITS } from './limits';
import { collect, type ValidationIssue, type ValidationResult } from './result';

function required(issues: ValidationIssue[], field: string, value: unknown): void {
  if (value === null || value === undefined || value === '') {
    issues.push({ field, message: 'обязательное поле' });
  }
}

function maxLen(issues: ValidationIssue[], field: string, value: string | null, max: number): void {
  if (value != null && value.length > max) {
    issues.push({ field, message: `длина > ${max} (получено ${value.length})` });
  }
}

function oneOf(
  issues: ValidationIssue[],
  field: string,
  value: string,
  allowed: readonly string[],
): void {
  if (!allowed.includes(value)) {
    issues.push({ field, message: `недопустимое значение: ${value}` });
  }
}

function bidInRange(issues: ValidationIssue[], field: string, micros: number | null): void {
  if (micros == null) return;
  const { minMicros, maxMicros } = DIRECT_LIMITS.bid;
  if (!Number.isInteger(micros) || micros < minMicros || micros > maxMicros) {
    issues.push({ field, message: `ставка вне диапазона [${minMicros}..${maxMicros}] микро` });
  }
}

export function validateClient(c: NewClient): ValidationResult {
  const issues: ValidationIssue[] = [];
  required(issues, 'login', c.login);
  return collect(issues);
}

export function validateCampaign(c: NewCampaign): ValidationResult {
  const issues: ValidationIssue[] = [];
  required(issues, 'name', c.name);
  required(issues, 'clientLocalId', c.clientLocalId);
  maxLen(issues, 'name', c.name, DIRECT_LIMITS.campaign.nameMaxLen);
  oneOf(issues, 'type', c.type, CAMPAIGN_TYPES);
  if (c.dailyBudgetMicros != null && c.dailyBudgetMicros < 0) {
    issues.push({ field: 'dailyBudgetMicros', message: 'бюджет не может быть отрицательным' });
  }
  return collect(issues);
}

export function validateAdGroup(g: NewAdGroup): ValidationResult {
  const issues: ValidationIssue[] = [];
  required(issues, 'name', g.name);
  required(issues, 'campaignLocalId', g.campaignLocalId);
  maxLen(issues, 'name', g.name, DIRECT_LIMITS.adGroup.nameMaxLen);
  oneOf(issues, 'type', g.type, AD_GROUP_TYPES);
  if ((g.regionIds?.length ?? 0) > DIRECT_LIMITS.adGroup.maxRegions) {
    issues.push({ field: 'regionIds', message: 'слишком много регионов' });
  }
  return collect(issues);
}

export function validateAd(a: NewAd): ValidationResult {
  const issues: ValidationIssue[] = [];
  required(issues, 'adGroupLocalId', a.adGroupLocalId);
  required(issues, 'title', a.title);
  required(issues, 'text', a.text);
  oneOf(issues, 'type', a.type, AD_TYPES);
  maxLen(issues, 'title', a.title, DIRECT_LIMITS.ad.titleMaxLen);
  maxLen(issues, 'title2', a.title2 ?? null, DIRECT_LIMITS.ad.title2MaxLen);
  maxLen(issues, 'text', a.text, DIRECT_LIMITS.ad.textMaxLen);
  maxLen(issues, 'displayUrlPath', a.displayUrlPath ?? null, DIRECT_LIMITS.ad.displayUrlPathMaxLen);
  return collect(issues);
}

export function validateKeyword(k: NewKeyword): ValidationResult {
  const issues: ValidationIssue[] = [];
  required(issues, 'adGroupLocalId', k.adGroupLocalId);
  required(issues, 'keyword', k.keyword);
  maxLen(issues, 'keyword', k.keyword, DIRECT_LIMITS.keyword.maxLen);
  const words = (k.keyword ?? '').trim().split(/\s+/).filter((w) => !w.startsWith('-') && w !== '');
  if (words.length > DIRECT_LIMITS.keyword.maxWords) {
    issues.push({ field: 'keyword', message: `> ${DIRECT_LIMITS.keyword.maxWords} слов` });
  }
  bidInRange(issues, 'bidMicros', k.bidMicros ?? null);
  bidInRange(issues, 'contextBidMicros', k.contextBidMicros ?? null);
  return collect(issues);
}
