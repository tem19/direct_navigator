import type { SyncContext } from './context';
import { InsufficientUnitsError, RateLimitError } from './errors';
import { serverHash } from './hash';
import { BATCH_LIMIT, UNIT_COST, chunk } from './limits';
import type { BulkResult, EntityType, LocalId, ServerObject, SyncReport, SyncRow } from './types';
import { ENTITY_ORDER, PARENT_OF } from './types';

/**
 * Push: локально → сервер.
 *
 * - строки `new | modified | deleted`, в порядке зависимостей;
 * - батчинг по лимитам сервиса;
 * - поэлементный разбор результата (частичная ошибка не валит батч);
 * - `new`-дети получают `direct_id` родителя, добавленного в этом же прогоне;
 * - пред-оценка баллов; на `error_code 56` — бэкофф.
 */
export async function runPush(ctx: SyncContext): Promise<SyncReport> {
  const report: SyncReport = {
    phase: 'push',
    pulled: 0,
    pushed: 0,
    failed: 0,
    conflicts: 0,
    unitsSpent: 0,
    errors: [],
  };
  ctx.progress.emit({ type: 'phase', phase: 'push', status: 'start' });

  // Собираем всё грязное заранее — чтобы оценить стоимость до первого запроса.
  const dirty = new Map<EntityType, SyncRow[]>();
  for (const entityType of ENTITY_ORDER) {
    dirty.set(entityType, ctx.entities.getDirtyRows(entityType));
  }

  guardUnits(ctx, dirty);

  // Карта localId → присвоенный direct_id: для перевешивания детей.
  const idMap = new Map<LocalId, number>();

  for (const entityType of ENTITY_ORDER) {
    const rows = dirty.get(entityType) ?? [];
    if (rows.length === 0) continue;

    const toAdd = rows.filter((r) => r.syncStatus === 'new');
    const toUpdate = rows.filter((r) => r.syncStatus === 'modified');
    const toDelete = rows.filter((r) => r.syncStatus === 'deleted' && r.directId != null);

    await pushAdds(ctx, entityType, toAdd, idMap, report);
    await pushUpdates(ctx, entityType, toUpdate, report);
    await pushDeletes(ctx, entityType, toDelete, report);
  }

  emitUnits(ctx);
  ctx.progress.emit({ type: 'phase', phase: 'push', status: 'done' });
  return report;
}

/** Пред-оценка стоимости push; при нехватке баллов — стоп до отправки. */
function guardUnits(ctx: SyncContext, dirty: Map<EntityType, SyncRow[]>): void {
  const remaining = ctx.api.units?.remaining;
  if (remaining == null) return; // баллы ещё неизвестны — проверим по факту
  let required = 0;
  for (const entityType of ENTITY_ORDER) {
    for (const row of dirty.get(entityType) ?? []) {
      if (row.syncStatus === 'new') required += UNIT_COST.add[entityType];
      else if (row.syncStatus === 'modified') required += UNIT_COST.update[entityType];
      else if (row.syncStatus === 'deleted') required += UNIT_COST.delete[entityType];
    }
  }
  if (required > remaining) {
    throw new InsufficientUnitsError(required, remaining);
  }
}

async function pushAdds(
  ctx: SyncContext,
  entityType: EntityType,
  rows: SyncRow[],
  idMap: Map<LocalId, number>,
  report: SyncReport,
): Promise<void> {
  if (rows.length === 0) return;
  const parentType = PARENT_OF[entityType];

  // Отсеиваем детей, чей родитель не добавился (нет direct_id) — иначе Директ
  // отклонит объект. Родителей мы уже обработали (порядок ENTITY_ORDER).
  const ready: SyncRow[] = [];
  for (const row of rows) {
    const parentDirectId = resolveParentId(row, idMap);
    if (parentType && parentDirectId == null) {
      report.failed += 1;
      report.errors.push({
        entityType,
        localId: row.localId,
        message: `родитель (${parentType}) не создан — объект пропущен`,
      });
      logItem(ctx, 'push', 'add', entityType, row.localId, undefined, 'skipped', 'нет родителя');
      continue;
    }
    ready.push(row);
  }

  for (const batch of chunk(ready, BATCH_LIMIT[entityType])) {
    const objects: ServerObject[] = batch.map((row) => ({
      entityType,
      id: 0,
      parentDirectId: resolveParentId(row, idMap),
      fields: row.fields,
    }));

    const result = await withBackoff(ctx, () =>
      ctx.api.add(ctx.account, entityType, objects),
    );
    accumulateUnits(ctx, report, result);

    result.results.forEach((item, i) => {
      const row = batch[i];
      if (item.id != null && !item.errors?.length) {
        const hash = serverHash(row.fields);
        ctx.entities.markSynced(entityType, row.localId, item.id, hash, ctx.clock.now());
        idMap.set(row.localId, item.id);
        // Сразу перевешиваем детей, у кого этот row — родитель.
        const childTypes = ENTITY_ORDER.filter((t) => PARENT_OF[t] === entityType);
        for (const childType of childTypes) {
          ctx.entities.setParentDirectId(childType, row.localId, item.id);
        }
        report.pushed += 1;
        logItem(ctx, 'push', 'add', entityType, row.localId, item.id, 'ok');
      } else {
        recordItemError(ctx, report, entityType, row.localId, 'add', item);
      }
    });

    emitEntity(ctx, entityType, 'add', batch.length);
  }
}

async function pushUpdates(
  ctx: SyncContext,
  entityType: EntityType,
  rows: SyncRow[],
  report: SyncReport,
): Promise<void> {
  if (rows.length === 0) return;
  for (const batch of chunk(rows, BATCH_LIMIT[entityType])) {
    const objects: ServerObject[] = batch.map((row) => ({
      entityType,
      id: row.directId as number,
      parentDirectId: row.parentDirectId,
      fields: row.fields,
    }));

    const result = await withBackoff(ctx, () =>
      ctx.api.update(ctx.account, entityType, objects),
    );
    accumulateUnits(ctx, report, result);

    result.results.forEach((item, i) => {
      const row = batch[i];
      if (!item.errors?.length) {
        const hash = serverHash(row.fields);
        ctx.entities.markSynced(entityType, row.localId, row.directId as number, hash, ctx.clock.now());
        report.pushed += 1;
        logItem(ctx, 'push', 'update', entityType, row.localId, row.directId ?? undefined, 'ok');
      } else {
        recordItemError(ctx, report, entityType, row.localId, 'update', item);
      }
    });

    emitEntity(ctx, entityType, 'update', batch.length);
  }
}

async function pushDeletes(
  ctx: SyncContext,
  entityType: EntityType,
  rows: SyncRow[],
  report: SyncReport,
): Promise<void> {
  if (rows.length === 0) return;
  for (const batch of chunk(rows, BATCH_LIMIT[entityType])) {
    const ids = batch.map((row) => row.directId as number);
    const result = await withBackoff(ctx, () =>
      ctx.api.delete(ctx.account, entityType, ids),
    );
    accumulateUnits(ctx, report, result);

    result.results.forEach((item, i) => {
      const row = batch[i];
      if (!item.errors?.length) {
        ctx.entities.hardDelete(entityType, row.localId); // физическое удаление после сервера
        report.pushed += 1;
        logItem(ctx, 'push', 'delete', entityType, row.localId, row.directId ?? undefined, 'ok');
      } else {
        recordItemError(ctx, report, entityType, row.localId, 'delete', item);
      }
    });

    emitEntity(ctx, entityType, 'delete', batch.length);
  }
}

/** direct_id родителя: из свежей карты добавлений либо из строки. */
function resolveParentId(row: SyncRow, idMap: Map<LocalId, number>): number | null {
  if (row.parentLocalId != null && idMap.has(row.parentLocalId)) {
    return idMap.get(row.parentLocalId) as number;
  }
  return row.parentDirectId;
}

/** Ретрай пачки на RateLimitError (error_code 56) с экспоненциальным бэкоффом. */
async function withBackoff(
  ctx: SyncContext,
  call: () => Promise<BulkResult>,
): Promise<BulkResult> {
  let attempt = 0;
  for (;;) {
    try {
      return await call();
    } catch (err) {
      if (err instanceof RateLimitError && attempt < ctx.rateLimitRetries) {
        const delay = err.retryAfterMs ?? 2000 * 2 ** attempt;
        ctx.progress.emit({
          type: 'log',
          message: `error_code 56: бэкофф ${delay}мс (попытка ${attempt + 1})`,
        });
        await ctx.sleep(delay);
        attempt += 1;
        continue;
      }
      throw err;
    }
  }
}

function recordItemError(
  ctx: SyncContext,
  report: SyncReport,
  entityType: EntityType,
  localId: LocalId,
  op: 'add' | 'update' | 'delete',
  item: { errors?: Array<{ code: number; message: string }> },
): void {
  const reason = item.errors?.map((e) => `[${e.code}] ${e.message}`).join('; ') ?? 'неизвестно';
  report.failed += 1;
  report.errors.push({ entityType, localId, message: reason });
  // Строка остаётся изменённой — уйдёт при следующем push.
  logItem(ctx, 'push', op, entityType, localId, undefined, 'error', reason);
  ctx.progress.emit({ type: 'error', entityType, localId, message: reason });
}

function accumulateUnits(ctx: SyncContext, report: SyncReport, result: BulkResult): void {
  report.unitsSpent += result.units.spent;
  ctx.progress.emit({ type: 'units', units: result.units });
}

function emitEntity(
  ctx: SyncContext,
  entityType: EntityType,
  op: 'add' | 'update' | 'delete',
  processed: number,
): void {
  ctx.progress.emit({ type: 'entity', entityType, op, processed, total: processed });
}

function emitUnits(ctx: SyncContext): void {
  if (ctx.api.units) ctx.progress.emit({ type: 'units', units: ctx.api.units });
}

function logItem(
  ctx: SyncContext,
  phase: 'push',
  op: 'add' | 'update' | 'delete',
  entityType: EntityType,
  localId: LocalId,
  directId: number | undefined,
  outcome: 'ok' | 'error' | 'skipped',
  message?: string,
): void {
  ctx.log.append({
    at: ctx.clock.now(),
    account: ctx.account,
    phase,
    op,
    entityType,
    localId,
    directId,
    outcome,
    message,
    unitsSpent: ctx.api.units?.spent,
  });
}
