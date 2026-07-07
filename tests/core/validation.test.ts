import { describe, it, expect } from 'vitest';
import {
  validateAd,
  validateCampaign,
  validateKeyword,
} from '../../src/core/validation';
import { DIRECT_LIMITS } from '../../src/core/validation/limits';

describe('validateCampaign', () => {
  it('требует имя и ограничивает длину', () => {
    expect(validateCampaign({ name: 'Кампания' }).ok).toBe(true);
    expect(validateCampaign({ name: '' }).ok).toBe(false);
    const long = 'x'.repeat(DIRECT_LIMITS.campaign.nameMax + 1);
    expect(validateCampaign({ name: long }).ok).toBe(false);
  });
});

describe('validateAd', () => {
  it('ловит превышение длины заголовка', () => {
    const res = validateAd({
      title: 'y'.repeat(DIRECT_LIMITS.ad.titleMax + 1),
      title2: null,
      text: 'Текст',
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.some((e) => e.field === 'title')).toBe(true);
  });

  it('валиден при корректных полях', () => {
    expect(
      validateAd({ title: 'Заголовок', title2: 'Второй', text: 'Текст объявления' }).ok,
    ).toBe(true);
  });
});

describe('validateKeyword', () => {
  it('ограничивает число слов и минимальную ставку', () => {
    const tooMany = validateKeyword({
      keyword: 'a b c d e f g h',
      bid: null,
    });
    expect(tooMany.ok).toBe(false);

    const lowBid = validateKeyword({ keyword: 'купить телефон', bid: 0.1 });
    expect(lowBid.ok).toBe(false);

    const ok = validateKeyword({ keyword: 'купить телефон -бу', bid: 15 });
    expect(ok.ok).toBe(true);
  });
});
