import { describe, expect, it } from 'vitest';
import { validateAd, validateCampaign, validateKeyword } from '../validators';

describe('validators (лимиты Директа)', () => {
  it('кампания без имени невалидна', () => {
    const r = validateCampaign({ clientLocalId: 1, name: '', type: 'TEXT_CAMPAIGN' });
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.field)).toContain('name');
  });

  it('объявление: заголовок > 56 символов невалиден', () => {
    const r = validateAd({
      adGroupLocalId: 1,
      type: 'TEXT_AD',
      title: 'x'.repeat(57),
      text: 'ok',
    });
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.field)).toContain('title');
  });

  it('корректное объявление валидно', () => {
    const r = validateAd({
      adGroupLocalId: 1,
      type: 'TEXT_AD',
      title: 'Заголовок',
      text: 'Текст объявления',
    });
    expect(r.ok).toBe(true);
  });

  it('ключевая фраза: > 7 слов невалидна, минус-слова не считаются', () => {
    const bad = validateKeyword({ adGroupLocalId: 1, keyword: 'a b c d e f g h' });
    expect(bad.ok).toBe(false);
    const good = validateKeyword({ adGroupLocalId: 1, keyword: 'a b c -minus -stop' });
    expect(good.ok).toBe(true);
  });

  it('ставка ниже минимума невалидна', () => {
    const r = validateKeyword({ adGroupLocalId: 1, keyword: 'купить телефон', bidMicros: 100 });
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.field)).toContain('bidMicros');
  });
});
