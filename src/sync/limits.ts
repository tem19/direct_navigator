import type { EntityType } from './types';

/**
 * Ограничения на число объектов в одном запросе Директа (режем на пачки).
 * Значения ориентировочные и вынесены сюда, чтобы легко подстроить.
 */
export const BATCH_LIMIT: Readonly<Record<EntityType, number>> = {
  campaign: 100,
  adgroup: 1000,
  ad: 1000,
  keyword: 10000,
};

/**
 * Ориентировочная стоимость операций в баллах (units) на элемент. Точные
 * тарифы Директа зависят от сервиса; таблица нужна для пред-оценки перед push,
 * чтобы не упереться в лимит на середине.
 */
export const UNIT_COST: Readonly<Record<'add' | 'update' | 'delete', Record<EntityType, number>>> = {
  add: { campaign: 20, adgroup: 20, ad: 20, keyword: 15 },
  update: { campaign: 15, adgroup: 15, ad: 15, keyword: 10 },
  delete: { campaign: 10, adgroup: 10, ad: 10, keyword: 5 },
};

/** Директовские коды ошибок, которые обрабатываем особо. */
export const ERROR_RATE_LIMIT = 56; // превышен лимит запросов → бэкофф
export const ERROR_NO_UNITS = 152; // недостаточно баллов

/** Разбить массив на пачки указанного размера. */
export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}
