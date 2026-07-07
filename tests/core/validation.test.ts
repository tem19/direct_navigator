import { describe, expect, it } from 'vitest';
import { validateAd, validateCampaign, validateKeyword } from '@core/validation';

describe('validateCampaign', () => {
  it('принимает корректную кампанию', () => {
    const r = validateCampaign({ clientLocalId: 1, name: 'Летняя распродажа', type: 'TEXT_CAMPAIGN' });
    expect(r.ok).toBe(true);
  });

  it('отклоняет пустое название', () => {
    const r = validateCampaign({ clientLocalId: 1, name: '', type: 'TEXT_CAMPAIGN' });
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.field === 'name')).toBe(true);
  });

  it('отклоняет отрицательный бюджет', () => {
    const r = validateCampaign({
      clientLocalId: 1,
      name: 'Кампания',
      type: 'TEXT_CAMPAIGN',
      dailyBudgetMicros: -5,
    });
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.field === 'dailyBudgetMicros')).toBe(true);
  });
});

describe('validateAd / validateKeyword (лимиты Директа)', () => {
  it('заголовок объявления > 56 символов невалиден', () => {
    const r = validateAd({ adGroupLocalId: 1, type: 'TEXT_AD', title: 'x'.repeat(57), text: 'ok' });
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

  it('ключевая фраза > 7 слов невалидна, минус-слова не считаются', () => {
    expect(validateKeyword({ adGroupLocalId: 1, keyword: 'a b c d e f g h' }).ok).toBe(false);
    expect(validateKeyword({ adGroupLocalId: 1, keyword: 'a b c -minus -stop' }).ok).toBe(true);
  });

  it('ставка ниже минимума невалидна', () => {
    const r = validateKeyword({ adGroupLocalId: 1, keyword: 'купить телефон', bidMicros: 100 });
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.field)).toContain('bidMicros');
  });
});
