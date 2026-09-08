import {
  formaterTemps,
  formaterArgent,
  formaterDate,
  getDateJour,
  genererId,
} from '../formatters';

describe('formaterTemps', () => {
  it('MM:SS sous une heure', () => {
    expect(formaterTemps(0)).toBe('00:00');
    expect(formaterTemps(65)).toBe('01:05');
    expect(formaterTemps(599)).toBe('09:59');
  });

  it('HH:MM:SS au-delà d’une heure', () => {
    expect(formaterTemps(3661)).toBe('01:01:01');
    expect(formaterTemps(36000)).toBe('10:00:00');
  });

  it('borne les négatifs et tronque les flottants', () => {
    expect(formaterTemps(-5)).toBe('00:00');
    expect(formaterTemps(90.9)).toBe('01:30');
  });
});

describe('formaterArgent', () => {
  it('2 décimales, séparateur virgule, symbole €', () => {
    expect(formaterArgent(2.5)).toBe('2,50 €');
    expect(formaterArgent(0)).toBe('0,00 €');
    expect(formaterArgent(1234.5)).toBe('1234,50 €');
  });
});

describe('formaterDate', () => {
  it("'YYYY-MM-DD' -> 'JJ/MM/AAAA'", () => {
    expect(formaterDate('2026-09-08')).toBe('08/09/2026');
    expect(formaterDate('2026-01-05')).toBe('05/01/2026');
  });
});

describe('getDateJour', () => {
  it('date locale au format YYYY-MM-DD (pas UTC)', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 8, 23, 30)); // 8 sept 23h30 local
    expect(getDateJour()).toBe('2026-09-08');
    jest.setSystemTime(new Date(2026, 0, 5, 0, 15)); // 5 jan 00h15 local
    expect(getDateJour()).toBe('2026-01-05');
    jest.useRealTimers();
  });
});

describe('genererId', () => {
  it('format <timestamp>-<suffixe> et unicité', () => {
    const a = genererId();
    const b = genererId();
    expect(a).toMatch(/^\d+-[a-z0-9]+$/);
    expect(a).not.toBe(b);
  });
});
