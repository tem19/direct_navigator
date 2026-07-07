import type { SyncContext } from './context';
import { resolveConflict as resolveConflictImpl } from './conflicts';
import type {
  ConflictRepository,
  DirectApiPort,
  EntityRepository,
  OperationLogRepository,
  SyncStateRepository,
  Clock,
  Sleep,
} from './ports';
import { ProgressEmitter, type ProgressListener } from './progress';
import { runPull } from './pull';
import { runPush } from './push';
import type { Conflict, ConflictResolution, SyncReport } from './types';

/** Зависимости движка (порты + опции). */
export interface SyncEngineDeps {
  account: string;
  api: DirectApiPort;
  entities: EntityRepository;
  state: SyncStateRepository;
  conflicts: ConflictRepository;
  log: OperationLogRepository;
  /** По умолчанию `Date.now`. */
  clock?: Clock;
  /** По умолчанию реальный `setTimeout`. Тесты подменяют на no-op. */
  sleep?: Sleep;
  /** Попыток на `error_code 56` перед пропуском пачки. По умолчанию 4. */
  rateLimitRetries?: number;
}

/**
 * Движок синхронизации локальной БД с Yandex Direct.
 *
 * Приводит офлайн-правки и серверное состояние к согласованному виду:
 *   full() = pull() затем push().
 *
 * Прогресс отдаётся через `onProgress` (сущности, потраченные баллы, ошибки,
 * конфликты) — для UI. Конфликты складываются в очередь и разрешаются через
 * `resolveConflict`.
 */
export class SyncEngine {
  private readonly ctx: SyncContext;
  private readonly progress = new ProgressEmitter();

  constructor(deps: SyncEngineDeps) {
    const clock: Clock = deps.clock ?? { now: () => Date.now() };
    const sleep: Sleep = deps.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.ctx = {
      account: deps.account,
      api: deps.api,
      entities: deps.entities,
      state: deps.state,
      conflicts: deps.conflicts,
      log: deps.log,
      progress: this.progress,
      clock,
      sleep,
      rateLimitRetries: deps.rateLimitRetries ?? 4,
    };
  }

  /** Подписка на стрим прогресса. Возвращает функцию отписки. */
  onProgress(listener: ProgressListener): () => void {
    return this.progress.on(listener);
  }

  /** Сервер → локально (инкрементально через `changes`, либо полная первичка). */
  pull(): Promise<SyncReport> {
    return runPull(this.ctx);
  }

  /** Локально → сервер (в порядке зависимостей, батчами, поэлементный разбор). */
  push(): Promise<SyncReport> {
    return runPush(this.ctx);
  }

  /** Полная синхра: pull, затем push. */
  async full(): Promise<SyncReport> {
    const pull = await this.pull();
    const push = await this.push();
    return {
      phase: 'full',
      pulled: pull.pulled,
      pushed: push.pushed,
      failed: pull.failed + push.failed,
      conflicts: pull.conflicts + push.conflicts,
      unitsSpent: pull.unitsSpent + push.unitsSpent,
      errors: [...pull.errors, ...push.errors],
    };
  }

  /** Диспетчер по режиму запуска: пусто → `full`. */
  run(mode: 'pull' | 'push' | 'full' | '' = ''): Promise<SyncReport> {
    if (mode === 'pull') return this.pull();
    if (mode === 'push') return this.push();
    return this.full();
  }

  /** Текущая очередь конфликтов (для UI). */
  listConflicts(): Conflict[] {
    return this.ctx.conflicts.list(this.ctx.account);
  }

  /** Разрешить конфликт: `keepLocal | takeServer | { perField }`. */
  resolveConflict(conflictId: string, resolution: ConflictResolution): void {
    resolveConflictImpl(
      { conflicts: this.ctx.conflicts, entities: this.ctx.entities, clock: this.ctx.clock },
      conflictId,
      resolution,
    );
  }
}
