/**
 * Cumul des stats du jour et remise à zéro au passage de minuit.
 */
import { useStatsStore } from '../statsStore';

jest.mock('../../utils/storage', () => ({
  chargerStatsJour: jest.fn(),
  chargerHistorique: jest.fn(),
  ajouterHistorique: jest.fn(),
  sauvegarder: jest.fn(),
}));

const storage = require('../../utils/storage');

const store = () => useStatsStore.getState();
const stats = () => useStatsStore.getState().statsJour;

const jourVide = (date: string) => ({
  nbCourses: 0,
  tempsTotal: 0,
  revenuTotal: 0,
  date,
});

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 8, 8, 10, 0, 0)); // 8 sept, heure locale

  (storage.chargerStatsJour as jest.Mock)
    .mockReset()
    .mockResolvedValue(jourVide('2026-09-08'));
  (storage.chargerHistorique as jest.Mock).mockReset().mockResolvedValue([]);
  (storage.ajouterHistorique as jest.Mock).mockReset().mockResolvedValue(undefined);
  (storage.sauvegarder as jest.Mock).mockReset().mockResolvedValue(true);

  useStatsStore.setState({
    statsJour: jourVide('2026-09-08'),
    historique: [],
    chargement: false,
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('terminerCourse', () => {
  it('cumule les courses de la même journée', async () => {
    await store().terminerCourse(600, 10);
    await store().terminerCourse(300, 5);

    expect(stats().nbCourses).toBe(2);
    expect(stats().tempsTotal).toBe(900);
    expect(stats().revenuTotal).toBe(15);
    expect(stats().date).toBe('2026-09-08');
  });

  it('repart de zéro quand la date a changé (chauffeur de nuit)', async () => {
    await store().terminerCourse(600, 10);
    expect(stats().nbCourses).toBe(1);

    jest.setSystemTime(new Date(2026, 8, 9, 1, 0, 0)); // +1 jour, 01:00
    await store().terminerCourse(120, 3);

    expect(stats().nbCourses).toBe(1);
    expect(stats().tempsTotal).toBe(120);
    expect(stats().revenuTotal).toBe(3);
    expect(stats().date).toBe('2026-09-09');
  });

  it('persiste stats + date de reset et rafraîchit l’historique', async () => {
    (storage.chargerHistorique as jest.Mock).mockResolvedValue([
      { date: '2026-09-08', nbCourses: 1, tempsTotal: 600, revenuTotal: 10 },
    ]);

    await store().terminerCourse(600, 10);

    expect(storage.sauvegarder).toHaveBeenCalledWith(
      '@vtc_stats_jour',
      expect.objectContaining({ nbCourses: 1, date: '2026-09-08' }),
    );
    expect(storage.sauvegarder).toHaveBeenCalledWith(
      '@vtc_date_reset',
      '2026-09-08',
    );
    expect(storage.ajouterHistorique).toHaveBeenCalled();
    expect(store().historique).toHaveLength(1);
  });
});
