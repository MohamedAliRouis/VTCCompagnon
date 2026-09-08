/**
 * Journal des courses / sessions : ajout, persistance, rétention 90 jours.
 */
import { useHistoryStore } from '../historyStore';

jest.mock('../../utils/storage', () => ({
  chargerCoursesHistorique: jest.fn(),
  sauvegarderCoursesHistorique: jest.fn(),
  chargerSessionsHistorique: jest.fn(),
  sauvegarderSessionsHistorique: jest.fn(),
  chargerHistorique: jest.fn(),
  chargerLogDepuis: jest.fn(),
  sauvegarderLogDepuis: jest.fn(),
}));

const storage = require('../../utils/storage');
const store = () => useHistoryStore.getState();

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 8, 8, 12, 0, 0)); // 2026-09-08

  storage.chargerCoursesHistorique.mockReset().mockResolvedValue([]);
  storage.sauvegarderCoursesHistorique.mockReset().mockResolvedValue(undefined);
  storage.chargerSessionsHistorique.mockReset().mockResolvedValue([]);
  storage.sauvegarderSessionsHistorique.mockReset().mockResolvedValue(undefined);
  storage.chargerHistorique.mockReset().mockResolvedValue([]);
  storage.chargerLogDepuis.mockReset().mockResolvedValue('2026-09-08');
  storage.sauvegarderLogDepuis.mockReset().mockResolvedValue(undefined);

  useHistoryStore.setState({
    courses: [],
    sessions: [],
    agregatsLegacy: [],
    logDepuis: '2026-09-08',
    chargement: false,
  });
});

afterEach(() => jest.useRealTimers());

describe('chargerHistorique', () => {
  it('charge courses, sessions et le legacy', async () => {
    storage.chargerCoursesHistorique.mockResolvedValue([{ id: 'c1' }]);
    storage.chargerSessionsHistorique.mockResolvedValue([{ id: 's1' }]);
    storage.chargerHistorique.mockResolvedValue([{ date: '2026-09-01' }]);

    await store().chargerHistorique();

    expect(store().courses).toHaveLength(1);
    expect(store().sessions).toHaveLength(1);
    expect(store().agregatsLegacy).toHaveLength(1);
  });

  it('fixe logDepuis au jour courant au premier lancement', async () => {
    storage.chargerLogDepuis.mockResolvedValue(null);

    await store().chargerHistorique();

    expect(store().logDepuis).toBe('2026-09-08');
    expect(storage.sauvegarderLogDepuis).toHaveBeenCalledWith('2026-09-08');
  });

  it('conserve un logDepuis déjà stocké', async () => {
    storage.chargerLogDepuis.mockResolvedValue('2026-06-01');

    await store().chargerHistorique();

    expect(store().logDepuis).toBe('2026-06-01');
    expect(storage.sauvegarderLogDepuis).not.toHaveBeenCalled();
  });
});

describe('enregistrerCourse', () => {
  it('ajoute une ligne datée du jour et persiste', async () => {
    await store().enregistrerCourse({ debut: 1000, duree: 600, revenu: 12 });

    const c = store().courses;
    expect(c).toHaveLength(1);
    expect(c[0]).toMatchObject({ date: '2026-09-08', duree: 600, revenu: 12 });
    expect(c[0].id).toBeTruthy();
    expect(storage.sauvegarderCoursesHistorique).toHaveBeenCalledWith(c);
  });

  it('purge les courses de plus de 90 jours', async () => {
    useHistoryStore.setState({
      courses: [
        { id: 'vieux', date: '2026-05-01', debut: 0, duree: 1, revenu: 1 },
        { id: 'recent', date: '2026-09-01', debut: 0, duree: 1, revenu: 1 },
      ],
    });

    await store().enregistrerCourse({ debut: 0, duree: 60, revenu: 5 });

    const dates = store().courses.map(c => c.date);
    expect(dates).not.toContain('2026-05-01'); // > 90 j -> purgé
    expect(dates).toContain('2026-09-01');
    expect(dates).toContain('2026-09-08');
  });
});

describe('enregistrerSession', () => {
  it('ajoute une session datée du jour et persiste', async () => {
    await store().enregistrerSession({
      debut: 1,
      fin: 2,
      tempsService: 3600,
      tempsPause: 600,
    });

    const s = store().sessions;
    expect(s).toHaveLength(1);
    expect(s[0]).toMatchObject({
      date: '2026-09-08',
      tempsService: 3600,
      tempsPause: 600,
    });
    expect(storage.sauvegarderSessionsHistorique).toHaveBeenCalledWith(s);
  });
});
