import { describe, expect, it } from 'vitest';
import { parseBulkResult } from '../bulk';
import type { ActionResult } from '../types/common';

describe('parseBulkResult', () => {
  it('разносит частичный успех по succeeded/failed с сохранением индекса', () => {
    const results: ActionResult[] = [
      { Id: 111 }, // ok
      { Errors: [{ Code: 8800, Message: 'Ошибка', Details: 'подробности' }] }, // fail
      { Id: 333, Warnings: [{ Code: 9000, Message: 'Предупреждение' }] }, // ok + warning
    ];
    const inputs = ['a', 'b', 'c'];

    const res = parseBulkResult(results, inputs);

    expect(res.hasErrors).toBe(true);
    expect(res.hasWarnings).toBe(true);

    expect(res.succeeded).toHaveLength(2);
    expect(res.succeeded[0]).toMatchObject({ index: 0, id: 111, input: 'a' });
    expect(res.succeeded[1]).toMatchObject({ index: 2, id: 333, input: 'c' });
    expect(res.succeeded[1].warnings[0].message).toBe('Предупреждение');

    expect(res.failed).toHaveLength(1);
    expect(res.failed[0]).toMatchObject({ index: 1, input: 'b' });
    expect(res.failed[0].errors[0]).toEqual({
      code: 8800,
      message: 'Ошибка',
      details: 'подробности',
    });
  });

  it('всё успешно — hasErrors=false', () => {
    const res = parseBulkResult([{ Id: 1 }, { Id: 2 }]);
    expect(res.hasErrors).toBe(false);
    expect(res.hasWarnings).toBe(false);
    expect(res.succeeded).toHaveLength(2);
    expect(res.failed).toHaveLength(0);
  });

  it('работает без переданных inputs', () => {
    const res = parseBulkResult([{ Errors: [{ Code: 1, Message: 'x' }] }]);
    expect(res.failed[0].input).toBeUndefined();
    expect(res.failed[0].index).toBe(0);
  });
});
