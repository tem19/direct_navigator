import type { ConflictRepository, EntityRepository, Clock } from './ports';
import type { Conflict, ConflictResolution } from './types';

export interface ResolveDeps {
  conflicts: ConflictRepository;
  entities: EntityRepository;
  clock: Clock;
}

/**
 * Разрешить конфликт. UI (`/grid-ui`) вызывает это после выбора пользователя.
 * - `keepLocal` — оставить локальную правку, но принять серверный `hash` как
 *   базу; строка становится `modified` и перезапишет сервер при следующем push.
 * - `takeServer` — принять серверную версию, пометить `synced`.
 * - `{ perField }` — собрать поле-за-полем; результат `modified`.
 */
export function resolveConflict(
  deps: ResolveDeps,
  conflictId: string,
  resolution: ConflictResolution,
): void {
  const conflict = deps.conflicts.get(conflictId);
  if (!conflict) {
    throw new Error(`Конфликт ${conflictId} не найден (уже разрешён?)`);
  }
  const { entityType, localId } = conflict;
  const now = deps.clock.now();

  if (resolution === 'takeServer') {
    deps.entities.applyServer(entityType, localId, conflict.server, conflict.serverHash, now);
  } else if (resolution === 'keepLocal') {
    deps.entities.rebaseLocal(entityType, localId, conflict.serverHash);
  } else {
    const merged = mergeByField(conflict, resolution.perField);
    deps.entities.rebaseLocal(entityType, localId, conflict.serverHash, merged);
  }

  deps.conflicts.remove(conflictId);
}

function mergeByField(
  conflict: Conflict,
  perField: Record<string, 'local' | 'server'>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...conflict.server, ...conflict.local };
  for (const diff of conflict.diffs) {
    const choice = perField[diff.field] ?? 'local';
    merged[diff.field] = choice === 'server' ? diff.server : diff.local;
  }
  return merged;
}
