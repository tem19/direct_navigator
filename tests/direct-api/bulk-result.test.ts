import { describe, it, expect } from 'vitest';
import { parseBulkResult } from '../../src/direct-api/bulk-result';

describe('parseBulkResult', () => {
  it('раскладывает частичный успех на succeeded/failed/warnings', () => {
    const inputs = [{ Name: 'A' }, { Name: 'B' }, { Name: 'C' }];
    const results = [
      { Id: 101 }, // успех
      { Errors: [{ Code: 4001, Message: 'Плохое имя' }] }, // ошибка
      { Id: 103, Warnings: [{ Code: 9000, Message: 'Внимание' }] }, // успех с предупреждением
    ];

    const bulk = parseBulkResult(inputs, results);

    expect(bulk.succeeded).toHaveLength(2);
    expect(bulk.failed).toHaveLength(1);
    expect(bulk.warnings).toHaveLength(1);
    expect(bulk.hasFailures).toBe(true);
    expect(bulk.succeeded[0].id).toBe(101);
    expect(bulk.failed[0].input).toEqual({ Name: 'B' });
    expect(bulk.warnings[0].id).toBe(103);
  });

  it('allSucceeded=true, когда ошибок нет', () => {
    const bulk = parseBulkResult([{ Name: 'A' }], [{ Id: 1 }]);
    expect(bulk.allSucceeded).toBe(true);
  });
});
