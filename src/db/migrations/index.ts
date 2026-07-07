import { migration0001 } from './0001_core';
import type { Migration } from './types';

/** Все миграции в порядке возрастания версии. Новые — только добавлять в конец. */
export const MIGRATIONS: readonly Migration[] = [migration0001];

export type { Migration };
