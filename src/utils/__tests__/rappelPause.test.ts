import { calculerRappelPause, DELAI_MIN_RAPPEL_MS } from '../rappelPause';

const H = 3_600_000;
const T0 = 1_700_000_000_000;

const base = {
  actif: true,
  etat: 'EN_SERVICE' as const,
  derniereReprise: T0,
  seuilMs: 3 * H,
  maintenant: T0 + 10 * 60_000, // 10 min après la reprise
};

describe('calculerRappelPause', () => {
  it('planifie au seuil après la dernière reprise', () => {
    expect(calculerRappelPause(base)).toBe(T0 + 3 * H);
  });

  it('ne planifie rien si le rappel est désactivé', () => {
    expect(calculerRappelPause({ ...base, actif: false })).toBeNull();
  });

  it('ne planifie rien en pause ou hors service', () => {
    expect(calculerRappelPause({ ...base, etat: 'EN_PAUSE' })).toBeNull();
    expect(calculerRappelPause({ ...base, etat: 'HORS_SERVICE' })).toBeNull();
  });

  it('ne planifie rien sans heure de reprise connue', () => {
    expect(calculerRappelPause({ ...base, derniereReprise: null })).toBeNull();
  });

  it('seuil déjà dépassé (app relancée) : marge minimale au lieu de notifier tout de suite', () => {
    const maintenant = T0 + 5 * H;
    expect(calculerRappelPause({ ...base, maintenant })).toBe(
      maintenant + DELAI_MIN_RAPPEL_MS,
    );
  });

  it('repartir de la dernière reprise, pas du début du service', () => {
    // pause terminée 1 h après le début : le compteur de 3 h repart de là
    const reprise = T0 + H;
    expect(
      calculerRappelPause({
        ...base,
        derniereReprise: reprise,
        maintenant: reprise + 60_000,
      }),
    ).toBe(reprise + 3 * H);
  });
});
