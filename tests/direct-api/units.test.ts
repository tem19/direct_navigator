import { describe, it, expect } from 'vitest';
import { parseUnits } from '../../src/direct-api/types/common';

describe('parseUnits', () => {
  it('разбирает заголовок Units "spent/balance/dailyLimit"', () => {
    expect(parseUnits('12/4988/5000')).toEqual({
      spent: 12,
      balance: 4988,
      dailyLimit: 5000,
    });
  });

  it('возвращает null на пустом/битом заголовке', () => {
    expect(parseUnits(null)).toBeNull();
    expect(parseUnits('foo')).toBeNull();
    expect(parseUnits('1/2')).toBeNull();
  });
});
