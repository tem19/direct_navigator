import { describe, expect, it } from 'vitest';
import { parseUnitsHeader } from '../units';

describe('parseUnitsHeader', () => {
  it('разбирает "потрачено/остаток/лимит"', () => {
    expect(parseUnitsHeader('10/7995/8000')).toEqual({ spent: 10, rest: 7995, limit: 8000 });
  });

  it('терпит пробелы вокруг чисел', () => {
    expect(parseUnitsHeader(' 5 / 100 / 200 ')).toEqual({ spent: 5, rest: 100, limit: 200 });
  });

  it('возвращает null на пустом/битом заголовке', () => {
    expect(parseUnitsHeader(null)).toBeNull();
    expect(parseUnitsHeader('')).toBeNull();
    expect(parseUnitsHeader('10/7995')).toBeNull();
    expect(parseUnitsHeader('a/b/c')).toBeNull();
  });
});
