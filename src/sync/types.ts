import type { UnitsInfo } from '../preload/contracts';

export interface SyncProgressEvent {
  phase: 'pull' | 'push' | 'done' | 'error';
  processed: number;
  total: number;
  unitsSpent: number;
  conflicts: number;
  failures: number;
  message?: string;
}

export interface SyncResult {
  pulled: number;
  pushed: number;
  conflicts: number;
  failures: number;
  units: UnitsInfo | null;
}

export type ProgressCallback = (e: SyncProgressEvent) => void;
