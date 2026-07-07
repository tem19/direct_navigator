import type { Client } from '../types/client';
import type { ClientRow } from './rows';
import { syncMetaFromRow } from './syncMeta';

export function clientFromRow(row: ClientRow): Client {
  return {
    ...syncMetaFromRow(row),
    login: row.login,
    name: row.name,
  };
}

export function clientServerSnapshot(c: Pick<Client, 'login' | 'name'>): Record<string, unknown> {
  return { login: c.login, name: c.name };
}
