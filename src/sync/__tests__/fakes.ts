/**
 * In-memory реализации портов для тестов движка. Никакого SQL и HTTP —
 * только фейки с тем же контрактом.
 */
import { serverHash } from '../hash';
import type {
  ConflictRepository,
  DirectApiPort,
  EntityRepository,
  NewSyncedRow,
  OperationLogRepository,
  SyncStateRepository,
} from '../ports';
import type {
  BulkResult,
  ChangesResult,
  CheckDictResult,
  Conflict,
  EntityType,
  LocalId,
  OperationLogEntry,
  ServerObject,
  SyncRow,
  UnitsInfo,
} from '../types';

let counter = 1000;
export const nextDirectId = () => ++counter;

export class FakeEntityRepo implements EntityRepository {
  rows: SyncRow[] = [];
  private seq = 1;

  seed(row: Partial<SyncRow> & { entityType: EntityType }): SyncRow {
    const full: SyncRow = {
      localId: row.localId ?? `L${this.seq++}`,
      entityType: row.entityType,
      directId: row.directId ?? null,
      parentLocalId: row.parentLocalId ?? null,
      parentDirectId: row.parentDirectId ?? null,
      syncStatus: row.syncStatus ?? 'new',
      serverHash: row.serverHash ?? null,
      fields: row.fields ?? {},
      updatedAtLocal: row.updatedAtLocal ?? 0,
      syncedAt: row.syncedAt ?? null,
    };
    this.rows.push(full);
    return full;
  }

  getDirtyRows(entityType: EntityType): SyncRow[] {
    return this.rows.filter(
      (r) => r.entityType === entityType && ['new', 'modified', 'deleted'].includes(r.syncStatus),
    );
  }

  getByDirectId(entityType: EntityType, directId: number): SyncRow | null {
    return this.rows.find((r) => r.entityType === entityType && r.directId === directId) ?? null;
  }

  getByLocalId(entityType: EntityType, localId: LocalId): SyncRow | null {
    return this.rows.find((r) => r.entityType === entityType && r.localId === localId) ?? null;
  }

  insertSynced(row: NewSyncedRow): void {
    this.rows.push({
      localId: `L${this.seq++}`,
      entityType: row.entityType,
      directId: row.directId,
      parentLocalId: null,
      parentDirectId: row.parentDirectId,
      syncStatus: 'synced',
      serverHash: row.serverHash,
      fields: row.fields,
      updatedAtLocal: 0,
      syncedAt: row.syncedAt,
    });
  }

  applyServer(
    entityType: EntityType,
    localId: LocalId,
    fields: Record<string, unknown>,
    hash: string,
    syncedAt: number,
  ): void {
    const r = this.getByLocalId(entityType, localId);
    if (!r) return;
    r.fields = fields;
    r.serverHash = hash;
    r.syncStatus = 'synced';
    r.syncedAt = syncedAt;
  }

  markConflict(entityType: EntityType, localId: LocalId): void {
    const r = this.getByLocalId(entityType, localId);
    if (r) r.syncStatus = 'conflict';
  }

  rebaseLocal(
    entityType: EntityType,
    localId: LocalId,
    hash: string,
    fields?: Record<string, unknown>,
  ): void {
    const r = this.getByLocalId(entityType, localId);
    if (!r) return;
    r.serverHash = hash;
    if (fields) r.fields = fields;
    r.syncStatus = 'modified';
  }

  markSynced(
    entityType: EntityType,
    localId: LocalId,
    directId: number,
    hash: string,
    syncedAt: number,
  ): void {
    const r = this.getByLocalId(entityType, localId);
    if (!r) return;
    r.directId = directId;
    r.serverHash = hash;
    r.syncStatus = 'synced';
    r.syncedAt = syncedAt;
  }

  setParentDirectId(childType: EntityType, parentLocalId: LocalId, parentDirectId: number): void {
    for (const r of this.rows) {
      if (r.entityType === childType && r.parentLocalId === parentLocalId) {
        r.parentDirectId = parentDirectId;
      }
    }
  }

  hardDelete(entityType: EntityType, localId: LocalId): void {
    this.rows = this.rows.filter((r) => !(r.entityType === entityType && r.localId === localId));
  }
}

export class FakeStateRepo implements SyncStateRepository {
  private store = new Map<string, string>();
  private key(a: string, s: string) {
    return `${a}::${s}`;
  }
  getTimestamp(account: string, scope: string): string | null {
    return this.store.get(this.key(account, scope)) ?? null;
  }
  setTimestamp(account: string, scope: string, timestamp: string): void {
    this.store.set(this.key(account, scope), timestamp);
  }
}

export class FakeConflictRepo implements ConflictRepository {
  items: Conflict[] = [];
  enqueue(c: Conflict): void {
    this.items.push(c);
  }
  list(): Conflict[] {
    return this.items;
  }
  get(id: string): Conflict | null {
    return this.items.find((c) => c.id === id) ?? null;
  }
  remove(id: string): void {
    this.items = this.items.filter((c) => c.id !== id);
  }
}

export class FakeLogRepo implements OperationLogRepository {
  entries: OperationLogEntry[] = [];
  append(e: OperationLogEntry): void {
    this.entries.push(e);
  }
}

const UNITS: UnitsInfo = { spent: 10, remaining: 100000, dailyLimit: 200000 };

/** Настраиваемый фейк API: считает вызовы, отдаёт заготовленные ответы. */
export class FakeDirectApi implements DirectApiPort {
  units: UnitsInfo | null = { ...UNITS };
  calls: string[] = [];

  checkDictResult: CheckDictResult = { timestamp: 't-dict', changed: false };
  checkResult: ChangesResult = { timestamp: 't1', notModified: true, modified: {}, deleted: {} };
  getResults: Partial<Record<EntityType, ServerObject[]>> = {};
  /** Кастомные обработчики bulk-операций (для частичного успеха/ошибок). */
  addHandler?: (t: EntityType, objs: ServerObject[]) => BulkResult;
  updateHandler?: (t: EntityType, objs: ServerObject[]) => BulkResult;
  deleteHandler?: (t: EntityType, ids: number[]) => BulkResult;

  async checkDict(): Promise<CheckDictResult> {
    this.calls.push('checkDict');
    return this.checkDictResult;
  }
  async check(): Promise<ChangesResult> {
    this.calls.push('check');
    return this.checkResult;
  }
  async get(_a: string, entityType: EntityType, ids?: number[]): Promise<ServerObject[]> {
    this.calls.push(`get:${entityType}:${ids?.join(',') ?? 'all'}`);
    return this.getResults[entityType] ?? [];
  }
  async add(_a: string, entityType: EntityType, objects: ServerObject[]): Promise<BulkResult> {
    this.calls.push(`add:${entityType}:${objects.length}`);
    if (this.addHandler) return this.addHandler(entityType, objects);
    return {
      units: { ...UNITS },
      results: objects.map(() => ({ id: nextDirectId() })),
    };
  }
  async update(_a: string, entityType: EntityType, objects: ServerObject[]): Promise<BulkResult> {
    this.calls.push(`update:${entityType}:${objects.length}`);
    if (this.updateHandler) return this.updateHandler(entityType, objects);
    return { units: { ...UNITS }, results: objects.map(() => ({})) };
  }
  async delete(_a: string, entityType: EntityType, ids: number[]): Promise<BulkResult> {
    this.calls.push(`delete:${entityType}:${ids.length}`);
    if (this.deleteHandler) return this.deleteHandler(entityType, ids);
    return { units: { ...UNITS }, results: ids.map(() => ({})) };
  }
}

/** Хелпер: серверный объект с хэшем полей. */
export function srv(
  entityType: EntityType,
  id: number,
  fields: Record<string, unknown>,
  parentDirectId: number | null = null,
): ServerObject {
  return { entityType, id, parentDirectId, fields };
}

export { serverHash };
