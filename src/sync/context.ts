import type {
  ConflictRepository,
  DirectApiPort,
  EntityRepository,
  OperationLogRepository,
  SyncStateRepository,
  Clock,
  Sleep,
} from './ports';
import type { ProgressEmitter } from './progress';

/** Всё, что нужно фазам pull/push. Собирается движком и прокидывается внутрь. */
export interface SyncContext {
  account: string;
  api: DirectApiPort;
  entities: EntityRepository;
  state: SyncStateRepository;
  conflicts: ConflictRepository;
  log: OperationLogRepository;
  progress: ProgressEmitter;
  clock: Clock;
  sleep: Sleep;
  /** Число попыток на `error_code 56` перед тем как пропустить пачку. */
  rateLimitRetries: number;
}
