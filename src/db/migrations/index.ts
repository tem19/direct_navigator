import { migration0001 } from './0001_core';
import { migration0002 } from './0002_app_settings';
import type { Migration } from './types';

/** Все миграции в порядке возрастания версии. Новые — только добавлять в конец. */
export const MIGRATIONS: readonly Migration[] = [migration0001, migration0002];

export type { Migration };
