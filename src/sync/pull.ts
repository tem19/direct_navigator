import type { SyncContext } from './context';
import { diffFields, serverHash } from './hash';
import type { EntityType, ServerObject, SyncReport, Conflict } from './types';
import { ENTITY_ORDER } from './types';

const SCOPE_CHANGES = 'changes';
const SCOPE_DICT = 'dict';

/**
 * Pull: сервер → локально.
 *
 * - есть timestamp → инкрементально через `changes/check` (экономим баллы);
 * - нет timestamp → полная первичная выгрузка `get` по всем сущностям;
 * - серверные данные применяются с детектом конфликтов.
 */
export async function runPull(ctx: SyncContext): Promise<SyncReport> {
  const report: SyncReport = {
    phase: 'pull',
    pulled: 0,
    pushed: 0,
    failed: 0,
    conflicts: 0,
    unitsSpent: 0,
    errors: [],
  };
  ctx.progress.emit({ type: 'phase', phase: 'pull', status: 'start' });

  const changesTs = ctx.state.getTimestamp(ctx.account, SCOPE_CHANGES);

  // Справочники: если менялись — сигналим (перечитка словарей вне зоны движка).
  await refreshDictTimestamp(ctx);

  if (changesTs === null) {
    await fullPull(ctx, report);
  } else {
    await incrementalPull(ctx, changesTs, report);
  }

  emitUnits(ctx, report);
  ctx.progress.emit({ type: 'phase', phase: 'pull', status: 'done' });
  return report;
}

async function refreshDictTimestamp(ctx: SyncContext): Promise<void> {
  const dictTs = ctx.state.getTimestamp(ctx.account, SCOPE_DICT);
  const res = await ctx.api.checkDict(ctx.account, dictTs);
  ctx.state.setTimestamp(ctx.account, SCOPE_DICT, res.timestamp);
  ctx.log.append({
    at: ctx.clock.now(),
    account: ctx.account,
    phase: 'pull',
    op: 'changes',
    outcome: 'ok',
    message: res.changed ? 'справочники изменились' : 'справочники без изменений',
  });
}

/** Первичная загрузка: полный `get` по всем сущностям с авто-пагинацией. */
async function fullPull(ctx: SyncContext, report: SyncReport): Promise<void> {
  let latest = '';
  for (const entityType of ENTITY_ORDER) {
    const objects = await ctx.api.get(ctx.account, entityType);
    ctx.log.append({
      at: ctx.clock.now(),
      account: ctx.account,
      phase: 'pull',
      op: 'get',
      entityType,
      outcome: 'ok',
      message: `первичная выгрузка: ${objects.length}`,
      unitsSpent: ctx.api.units?.spent,
    });
    applyObjects(ctx, entityType, objects, report);
    emitEntity(ctx, entityType, objects.length);
  }
  // После первичной выгрузки берём серверный timestamp через changes/check,
  // чтобы следующий pull пошёл инкрементально.
  const res = await ctx.api.check(ctx.account, [...ENTITY_ORDER], null);
  latest = res.timestamp;
  ctx.state.setTimestamp(ctx.account, SCOPE_CHANGES, latest);
}

/** Инкрементальный pull через сервис `changes`. */
async function incrementalPull(
  ctx: SyncContext,
  timestamp: string,
  report: SyncReport,
): Promise<void> {
  const changes = await ctx.api.check(ctx.account, [...ENTITY_ORDER], timestamp);
  ctx.log.append({
    at: ctx.clock.now(),
    account: ctx.account,
    phase: 'pull',
    op: 'changes',
    outcome: 'ok',
    message: changes.notModified ? 'изменений нет' : 'есть изменения',
    unitsSpent: ctx.api.units?.spent,
  });

  // Критерий готовности: повторный pull без изменений НЕ делает лишних `get`.
  if (changes.notModified) {
    ctx.state.setTimestamp(ctx.account, SCOPE_CHANGES, changes.timestamp);
    return;
  }

  for (const entityType of ENTITY_ORDER) {
    const modifiedIds = changes.modified[entityType] ?? [];
    if (modifiedIds.length > 0) {
      const objects = await ctx.api.get(ctx.account, entityType, modifiedIds);
      applyObjects(ctx, entityType, objects, report);
      emitEntity(ctx, entityType, objects.length);
      ctx.log.append({
        at: ctx.clock.now(),
        account: ctx.account,
        phase: 'pull',
        op: 'get',
        entityType,
        outcome: 'ok',
        message: `изменено на сервере: ${objects.length}`,
        unitsSpent: ctx.api.units?.spent,
      });
    }

    const deletedIds = changes.deleted[entityType] ?? [];
    for (const directId of deletedIds) {
      applyServerDelete(ctx, entityType, directId, report);
    }
  }

  ctx.state.setTimestamp(ctx.account, SCOPE_CHANGES, changes.timestamp);
}

/** Применить пачку серверных объектов одной сущности. */
function applyObjects(
  ctx: SyncContext,
  entityType: EntityType,
  objects: ServerObject[],
  report: SyncReport,
): void {
  const now = ctx.clock.now();
  for (const obj of objects) {
    const hash = serverHash(obj.fields);
    const local = ctx.entities.getByDirectId(entityType, obj.id);

    if (!local) {
      ctx.entities.insertSynced({
        entityType,
        directId: obj.id,
        parentDirectId: obj.parentDirectId,
        fields: obj.fields,
        serverHash: hash,
        syncedAt: now,
      });
      report.pulled += 1;
      continue;
    }

    switch (local.syncStatus) {
      case 'synced':
        // Обновляем, только если сервер реально поменялся.
        if (local.serverHash !== hash) {
          ctx.entities.applyServer(entityType, local.localId, obj.fields, hash, now);
          report.pulled += 1;
        }
        break;

      case 'modified':
      case 'new':
        // Локальная правка + сервер тоже изменился → конфликт, НЕ затираем.
        if (local.serverHash !== hash) {
          const conflict = buildConflict(ctx, entityType, local.localId, obj, hash, now);
          ctx.conflicts.enqueue(conflict);
          ctx.entities.markConflict(entityType, local.localId);
          ctx.progress.emit({ type: 'conflict', conflict });
          ctx.log.append({
            at: now,
            account: ctx.account,
            phase: 'pull',
            op: 'conflict',
            entityType,
            localId: local.localId,
            directId: obj.id,
            outcome: 'warning',
            message: `конфликт по ${conflict.diffs.length} пол.`,
          });
          report.conflicts += 1;
        }
        // Иначе сервер не менялся — сохраняем локальную правку как есть.
        break;

      case 'conflict':
      case 'deleted':
        // Уже в конфликте / помечено на удаление — не трогаем при pull.
        break;
    }
  }
}

/** Сервер удалил объект: если локально нет правок — убираем. */
function applyServerDelete(
  ctx: SyncContext,
  entityType: EntityType,
  directId: number,
  report: SyncReport,
): void {
  const local = ctx.entities.getByDirectId(entityType, directId);
  if (!local) return;
  if (local.syncStatus === 'synced') {
    ctx.entities.hardDelete(entityType, local.localId);
    report.pulled += 1;
  } else {
    // Локальные правки при удалённом на сервере объекте — тоже конфликт.
    const conflict = buildConflict(
      ctx,
      entityType,
      local.localId,
      { entityType, id: directId, parentDirectId: local.parentDirectId, fields: {} },
      '',
      ctx.clock.now(),
    );
    ctx.conflicts.enqueue(conflict);
    ctx.entities.markConflict(entityType, local.localId);
    ctx.progress.emit({ type: 'conflict', conflict });
    report.conflicts += 1;
  }
}

function buildConflict(
  ctx: SyncContext,
  entityType: EntityType,
  localId: SyncReportLocalId,
  server: ServerObject,
  hash: string,
  now: number,
): Conflict {
  const local = ctx.entities.getByLocalId(entityType, localId);
  const localFields = local?.fields ?? {};
  return {
    id: `${entityType}:${server.id}:${now}`,
    account: ctx.account,
    entityType,
    localId,
    directId: server.id,
    local: localFields,
    server: server.fields,
    serverHash: hash,
    diffs: diffFields(localFields, server.fields),
    detectedAt: now,
  };
}

type SyncReportLocalId = Conflict['localId'];

function emitEntity(ctx: SyncContext, entityType: EntityType, count: number): void {
  ctx.progress.emit({ type: 'entity', entityType, op: 'pull', processed: count, total: count });
}

function emitUnits(ctx: SyncContext, report: SyncReport): void {
  if (ctx.api.units) {
    report.unitsSpent = ctx.api.units.spent;
    ctx.progress.emit({ type: 'units', units: ctx.api.units });
  }
}
